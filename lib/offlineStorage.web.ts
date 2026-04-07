/**
 * Cache hors-ligne sur le web sans expo-sqlite (WASM non résolu par Metro en dev).
 * Persistance best-effort via localStorage ; sinon mémoire uniquement.
 */

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

const META_LAST_SYNC_KEY = 'last_garde_sync';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RPC_DISTANCE_KM = 20;
const H24_MS = 24 * 60 * 60 * 1000;

const LS_META = 'pharmacie-garde:web:meta';
const LS_PHARM = 'pharmacie-garde:web:pharmacies';
const LS_GARDES = 'pharmacie-garde:web:gardes';
const LS_VERIF = 'pharmacie-garde:web:verifications';

type MetaMap = Record<string, number>;
type PharmMap = Record<string, { payload: string; updated_at: number }>;
type GardeRowStored = GardeCacheRow & { updated_at: number };
type VerifRowStored = {
  id: string;
  pharmacy_id: string;
  status: string;
  created_at: string;
  updated_at: number;
};

const syncListeners = new Set<() => void>();

export function subscribeOfflineSync(cb: () => void): () => void {
  syncListeners.add(cb);
  return (): void => {
    syncListeners.delete(cb);
  };
}

function emitOfflineSync(): void {
  syncListeners.forEach((l) => {
    l();
  });
}

function webStorage(): Storage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Fallback mémoire si pas de localStorage (SSR / mode privé strict). */
let memMeta: MetaMap = {};
let memPharm: PharmMap = {};
let memGardes: GardeRowStored[] = [];
let memVerif: VerifRowStored[] = [];

function readJson<T>(key: string, fallback: T): T {
  const s = webStorage();
  if (s === null) return fallback;
  try {
    const raw = s.getItem(key);
    if (raw === null || raw === '') return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  const s = webStorage();
  if (s === null) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privé */
  }
}

function loadMeta(): MetaMap {
  const s = webStorage();
  if (s === null) return { ...memMeta };
  return readJson<MetaMap>(LS_META, {});
}

function saveMeta(m: MetaMap): void {
  const s = webStorage();
  if (s === null) {
    memMeta = { ...m };
    return;
  }
  writeJson(LS_META, m);
}

function loadPharmMap(): PharmMap {
  const s = webStorage();
  if (s === null) return { ...memPharm };
  return readJson<PharmMap>(LS_PHARM, {});
}

function savePharmMap(m: PharmMap): void {
  const s = webStorage();
  if (s === null) {
    memPharm = { ...m };
    return;
  }
  writeJson(LS_PHARM, m);
}

function loadGardesStored(): GardeRowStored[] {
  const s = webStorage();
  if (s === null) return [...memGardes];
  return readJson<GardeRowStored[]>(LS_GARDES, []);
}

function saveGardesStored(rows: GardeRowStored[]): void {
  const s = webStorage();
  if (s === null) {
    memGardes = [...rows];
    return;
  }
  writeJson(LS_GARDES, rows);
}

function loadVerifStored(): VerifRowStored[] {
  const s = webStorage();
  if (s === null) return [...memVerif];
  return readJson<VerifRowStored[]>(LS_VERIF, []);
}

function saveVerifStored(rows: VerifRowStored[]): void {
  const s = webStorage();
  if (s === null) {
    memVerif = [...rows];
    return;
  }
  writeJson(LS_VERIF, rows);
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

export async function clearOldCache(): Promise<void> {
  try {
    const threshold = Date.now() - CACHE_MAX_AGE_MS;
    const pharm = loadPharmMap();
    for (const id of Object.keys(pharm)) {
      if (pharm[id].updated_at < threshold) {
        delete pharm[id];
      }
    }
    savePharmMap(pharm);
    saveGardesStored(
      loadGardesStored().filter((g) => g.updated_at >= threshold),
    );
    saveVerifStored(
      loadVerifStored().filter((v) => v.updated_at >= threshold),
    );
  } catch {
    /* best-effort */
  }
}

let purgeOnce = false;

async function ensurePurgeOnce(): Promise<void> {
  if (!purgeOnce) {
    purgeOnce = true;
    await clearOldCache();
  }
}

export async function updateOfflineMeta(timestampMs: number): Promise<void> {
  await ensurePurgeOnce();
  const meta = loadMeta();
  meta[META_LAST_SYNC_KEY] = timestampMs;
  saveMeta(meta);
  emitOfflineSync();
}

export async function getLastSyncDate(): Promise<Date | null> {
  try {
    await ensurePurgeOnce();
    const meta = loadMeta();
    const v = meta[META_LAST_SYNC_KEY];
    if (v === undefined) return null;
    return new Date(v);
  } catch {
    return null;
  }
}

export async function savePharmacies(pharmacies: PharmacyDeGarde[]): Promise<void> {
  await ensurePurgeOnce();
  const map = loadPharmMap();
  const now = Date.now();
  for (const p of pharmacies) {
    map[p.id] = { payload: JSON.stringify(toPayload(p)), updated_at: now };
  }
  savePharmMap(map);
}

export async function saveGardes(
  rows: {
    pharmacy_id: string;
    start_date: string;
    end_date: string;
    is_24h: boolean;
  }[],
): Promise<void> {
  await ensurePurgeOnce();
  const now = Date.now();
  const stored: GardeRowStored[] = rows.map((r) => ({
    pharmacy_id: r.pharmacy_id,
    start_date: r.start_date,
    end_date: r.end_date,
    is_24h: r.is_24h ? 1 : 0,
    updated_at: now,
  }));
  saveGardesStored(stored);
}

export async function saveVerifications(
  rows: {
    id: string;
    pharmacy_id: string;
    status: string;
    created_at: string;
  }[],
): Promise<void> {
  await ensurePurgeOnce();
  const now = Date.now();
  const stored: VerifRowStored[] = rows.map((r) => ({
    ...r,
    updated_at: now,
  }));
  saveVerifStored(stored);
}

export async function loadGardes(): Promise<GardeCacheRow[]> {
  try {
    await ensurePurgeOnce();
    return loadGardesStored().map((g) => ({
      pharmacy_id: g.pharmacy_id,
      start_date: g.start_date,
      end_date: g.end_date,
      is_24h: g.is_24h,
    }));
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
  const byPh = new Map<
    string,
    { pharmacy_id: string; status: string; created_at: string }[]
  >();
  for (const r of rows) {
    const list = byPh.get(r.pharmacy_id) ?? [];
    list.push(r);
    byPh.set(r.pharmacy_id, list);
  }
  const out = new Map<string, VerificationAgg>();
  for (const [pid, events] of byPh.entries()) {
    const sorted = [...events].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
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

export async function loadPharmacies(
  userLat: number,
  userLng: number,
): Promise<PharmacyDeGarde[]> {
  try {
    await ensurePurgeOnce();
    const todayStr = toLocalISODate(new Date());
    const gardesAll = loadGardesStored();
    const gardes = gardesAll.filter(
      (g) => todayStr >= g.start_date && todayStr <= g.end_date,
    );
    if (gardes.length === 0) {
      return [];
    }
    const gardeByPh = new Map(
      gardes.map((g) => [g.pharmacy_id, g] as const),
    );
    const ids = [...gardeByPh.keys()];
    const pharmMap = loadPharmMap();
    const pharmRows = ids
      .map((id) =>
        pharmMap[id] !== undefined
          ? { id, payload: pharmMap[id].payload }
          : null,
      )
      .filter((r): r is { id: string; payload: string } => r !== null);

    const since = new Date(Date.now() - H24_MS).toISOString();
    const verRows = loadVerifStored().filter((v) => v.created_at >= since);
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

export async function persistGardeSnapshotFromRpc(
  pharmacies: PharmacyDeGarde[],
  verifications: {
    id: string;
    pharmacy_id: string;
    status: string;
    created_at: string;
  }[],
): Promise<void> {
  await ensurePurgeOnce();
  const bounds = getCurrentGardePeriodDateBounds();
  const now = Date.now();
  const gardes: GardeRowStored[] = [];
  const pharmMap = loadPharmMap();

  for (const p of pharmacies) {
    gardes.push({
      pharmacy_id: p.id,
      start_date: bounds.start,
      end_date: bounds.end,
      is_24h: p.is_24h ? 1 : 0,
      updated_at: now,
    });
    pharmMap[p.id] = {
      payload: JSON.stringify(toPayload(p)),
      updated_at: now,
    };
  }

  const verStored: VerifRowStored[] = verifications.map((v) => ({
    ...v,
    updated_at: now,
  }));

  saveGardesStored(gardes);
  savePharmMap(pharmMap);
  saveVerifStored(verStored);
  const meta = loadMeta();
  meta[META_LAST_SYNC_KEY] = now;
  saveMeta(meta);
  emitOfflineSync();
}
