/**
 * Cache SQLite mode hors-ligne — specs §6.2 (pharmacies, gardes, vérifications 24h).
 */

import * as SQLite from 'expo-sqlite';

import {
  getCurrentGardePeriodDateBounds,
  toLocalISODate,
} from '@/lib/gardeSchedule';
import { haversineDistanceKm } from '@/lib/distance';
import type {
  CachedPharmacyPayload,
  GardeCacheRow,
} from '@/lib/offline-storage-types';
import type { PharmacyDeGarde } from '@/types/pharmacy';

export type { CachedPharmacyPayload, GardeCacheRow } from '@/lib/offline-storage-types';

const DB_NAME = 'pharmacie-garde.db';
const META_LAST_SYNC_KEY = 'last_garde_sync';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RPC_DISTANCE_KM = 20;
const H24_MS = 24 * 60 * 60 * 1000;

const syncListeners = new Set<() => void>();

export function subscribeOfflineSync(cb: () => void): () => void {
  syncListeners.add(cb);
  return (): void => {
    syncListeners.delete(cb);
  };
}

function emitOfflineSync(): void {
  syncListeners.forEach((l) => l());
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let purgeOnce = false;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbPromise === null) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_meta (
          key TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pharmacies_cache (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS gardes_cache (
          pharmacy_id TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          is_24h INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (pharmacy_id, start_date)
        );
        CREATE TABLE IF NOT EXISTS verifications_cache (
          id TEXT PRIMARY KEY,
          pharmacy_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
      if (!purgeOnce) {
        purgeOnce = true;
        await clearOldCache();
      }
      return db;
    })();
  }
  return dbPromise;
}

function toPayload(p: PharmacyDeGarde): CachedPharmacyPayload {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    commune: p.commune,
    latitude: p.latitude,
    longitude: p.longitude,
    phone_primary: p.phone_primary,
    phone_secondary: p.phone_secondary,
    pharmacist_name: p.pharmacist_name,
    photo_url: p.photo_url,
    accepted_insurance: p.accepted_insurance,
    accepted_mobile_money: p.accepted_mobile_money,
    rating: p.rating,
    review_count: p.review_count,
  };
}

/** Supprime les entrées plus vieilles que 7 jours (specs alignées §6). */
export async function clearOldCache(): Promise<void> {
  try {
    const db = await getDb();
    const threshold = Date.now() - CACHE_MAX_AGE_MS;
    await db.runAsync(`DELETE FROM pharmacies_cache WHERE updated_at < ?`, threshold);
    await db.runAsync(`DELETE FROM gardes_cache WHERE updated_at < ?`, threshold);
    await db.runAsync(`DELETE FROM verifications_cache WHERE updated_at < ?`, threshold);
  } catch {
    /* best-effort */
  }
}

export async function updateOfflineMeta(timestampMs: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO offline_meta (key, value) VALUES (?, ?)`,
    META_LAST_SYNC_KEY,
    timestampMs,
  );
  emitOfflineSync();
}

export async function getLastSyncDate(): Promise<Date | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: number }>(
      `SELECT value FROM offline_meta WHERE key = ?`,
      META_LAST_SYNC_KEY,
    );
    if (row === null || row === undefined) return null;
    return new Date(row.value);
  } catch {
    return null;
  }
}

/** Enregistre les lignes pharmacie (snapshot statique). */
export async function savePharmacies(pharmacies: PharmacyDeGarde[]): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const p of pharmacies) {
      await db.runAsync(
        `INSERT OR REPLACE INTO pharmacies_cache (id, payload, updated_at) VALUES (?, ?, ?)`,
        p.id,
        JSON.stringify(toPayload(p)),
        now,
      );
    }
  });
}

/** Enregistre la rotation de garde (remplace les lignes courantes). */
export async function saveGardes(
  rows: {
    pharmacy_id: string;
    start_date: string;
    end_date: string;
    is_24h: boolean;
  }[],
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM gardes_cache`);
    for (const r of rows) {
      await db.runAsync(
        `INSERT INTO gardes_cache (pharmacy_id, start_date, end_date, is_24h, updated_at) VALUES (?, ?, ?, ?, ?)`,
        r.pharmacy_id,
        r.start_date,
        r.end_date,
        r.is_24h ? 1 : 0,
        now,
      );
    }
  });
}

/** Vérifications récentes pour enrichir le cache (specs §6.2, fenêtre 24h). */
export async function saveVerifications(
  rows: {
    id: string;
    pharmacy_id: string;
    status: string;
    created_at: string;
  }[],
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM verifications_cache`);
    for (const r of rows) {
      await db.runAsync(
        `INSERT OR REPLACE INTO verifications_cache (id, pharmacy_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        r.id,
        r.pharmacy_id,
        r.status,
        r.created_at,
        now,
      );
    }
  });
}

/** Charge les gardes brutes (inspection / debug). */
export async function loadGardes(): Promise<GardeCacheRow[]> {
  try {
    const db = await getDb();
    return await db.getAllAsync<GardeCacheRow>(
      `SELECT pharmacy_id, start_date, end_date, is_24h FROM gardes_cache`,
    );
  } catch {
    return [];
  }
}

type VerificationAgg = {
  count: number;
  last: string | null;
  lastStatus: 'open' | 'closed' | null;
};

function aggregateVerifications(
  rows: { pharmacy_id: string; status: string; created_at: string }[],
): Map<string, VerificationAgg> {
  const byPh = new Map<string, { pharmacy_id: string; status: string; created_at: string }[]>();
  for (const r of rows) {
    const list = byPh.get(r.pharmacy_id) ?? [];
    list.push(r);
    byPh.set(r.pharmacy_id, list);
  }
  const out = new Map<string, VerificationAgg>();
  for (const [pid, events] of byPh.entries()) {
    const sorted = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const head = sorted[0];
    const st = head?.status;
    const lastStatus: 'open' | 'closed' | null =
      st === 'open' || st === 'closed' ? st : null;
    out.set(pid, {
      count: sorted.length,
      last: head?.created_at ?? null,
      lastStatus,
    });
  }
  return out;
}

/**
 * Reconstruit la liste « pharmacies de garde » pour une position utilisateur
 * (distance client + filtre 20 km comme le RPC).
 */
export async function loadPharmacies(
  userLat: number,
  userLng: number,
): Promise<PharmacyDeGarde[]> {
  try {
    const db = await getDb();
    const todayStr = toLocalISODate(new Date());
    const gardes = await db.getAllAsync<GardeCacheRow>(
      `SELECT pharmacy_id, start_date, end_date, is_24h FROM gardes_cache WHERE ? >= start_date AND ? <= end_date`,
      todayStr,
      todayStr,
    );
    if (gardes.length === 0) {
      return [];
    }
    const gardeByPh = new Map(
      gardes.map((g) => [g.pharmacy_id, g] as const),
    );
    const ids = [...gardeByPh.keys()];
    const placeholders = ids.map(() => '?').join(',');
    const pharmRows = await db.getAllAsync<{ id: string; payload: string }>(
      `SELECT id, payload FROM pharmacies_cache WHERE id IN (${placeholders})`,
      ...ids,
    );

    const since = new Date(Date.now() - H24_MS).toISOString();
    const verRows = await db.getAllAsync<{
      pharmacy_id: string;
      status: string;
      created_at: string;
    }>(
      `SELECT pharmacy_id, status, created_at FROM verifications_cache WHERE created_at >= ?`,
      since,
    );
    const vAgg = aggregateVerifications(verRows);

    const list: PharmacyDeGarde[] = [];
    for (const row of pharmRows) {
      const g = gardeByPh.get(row.id);
      if (g === undefined) continue;
      const payload = JSON.parse(row.payload) as CachedPharmacyPayload;
      const dist = haversineDistanceKm(
        userLat,
        userLng,
        payload.latitude,
        payload.longitude,
      );
      const distance_km = Math.round(dist * 10) / 10;
      if (distance_km > MAX_RPC_DISTANCE_KM) continue;
      const duration_min = Math.round((distance_km / 20) * 60);
      const vs = vAgg.get(payload.id) ?? {
        count: 0,
        last: null,
        lastStatus: null,
      };
      list.push({
        ...payload,
        is_24h: g.is_24h === 1,
        distance_km,
        duration_min,
        verification_count: vs.count,
        last_verification: vs.last,
        last_verification_status: vs.lastStatus,
        avg_wait_time: null,
      });
    }
    list.sort((a, b) => a.distance_km - b.distance_km);
    return list;
  } catch {
    return [];
  }
}

/**
 * Persistance atomique après succès RPC (pharmacies + gardes + vérifs + meta).
 */
export async function persistGardeSnapshotFromRpc(
  pharmacies: PharmacyDeGarde[],
  verifications: {
    id: string;
    pharmacy_id: string;
    status: string;
    created_at: string;
  }[],
): Promise<void> {
  const db = await getDb();
  const bounds = getCurrentGardePeriodDateBounds();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`DELETE FROM gardes_cache`);
    for (const p of pharmacies) {
      await db.runAsync(
        `INSERT INTO gardes_cache (pharmacy_id, start_date, end_date, is_24h, updated_at) VALUES (?, ?, ?, ?, ?)`,
        p.id,
        bounds.start,
        bounds.end,
        p.is_24h ? 1 : 0,
        now,
      );
      await db.runAsync(
        `INSERT OR REPLACE INTO pharmacies_cache (id, payload, updated_at) VALUES (?, ?, ?)`,
        p.id,
        JSON.stringify(toPayload(p)),
        now,
      );
    }
    await db.execAsync(`DELETE FROM verifications_cache`);
    for (const v of verifications) {
      await db.runAsync(
        `INSERT OR REPLACE INTO verifications_cache (id, pharmacy_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        v.id,
        v.pharmacy_id,
        v.status,
        v.created_at,
        now,
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_meta (key, value) VALUES (?, ?)`,
      META_LAST_SYNC_KEY,
      now,
    );
  });
  emitOfflineSync();
}
