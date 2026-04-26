import { Building2, Inbox, Loader2, Pencil, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminPageHeader } from '@/components/AdminPageHeader';
import { MapPicker } from '@/components/MapPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { PHARMACY_PHOTOS_BUCKET, supabase } from '@/lib/supabase';
import type { Pharmacy, PharmacyInsert } from '@/types/database';

import { COTE_IVOIRE_COMMUNES } from '@pharma/lib/cote-ivoire-communes';

const DEFAULT_LAT = 5.36;
const DEFAULT_LNG = -4.0083;

function parseListInput(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type FormState = {
  id: string | null;
  name: string;
  address: string;
  commune: string;
  city: string;
  latitude: number;
  longitude: number;
  phone_primary: string;
  phone_secondary: string;
  pharmacist_name: string;
  photo_url: string;
  accepted_insurance: string;
  accepted_mobile_money: string;
  rating: string;
  review_count: number;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    id: null,
    name: '',
    address: '',
    commune: 'Cocody',
    city: 'Abidjan',
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    phone_primary: '',
    phone_secondary: '',
    pharmacist_name: '',
    photo_url: '',
    accepted_insurance: '',
    accepted_mobile_money: '',
    rating: '0',
    review_count: 0,
    is_active: true,
  };
}

function fromRow(row: Pharmacy): FormState {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    commune: row.commune,
    city: row.city,
    latitude: Number.parseFloat(row.latitude),
    longitude: Number.parseFloat(row.longitude),
    phone_primary: row.phone_primary,
    phone_secondary: row.phone_secondary ?? '',
    pharmacist_name: row.pharmacist_name ?? '',
    photo_url: row.photo_url ?? '',
    accepted_insurance: row.accepted_insurance.join(', '),
    accepted_mobile_money: row.accepted_mobile_money.join(', '),
    rating: row.rating,
    review_count: row.review_count,
    is_active: row.is_active,
  };
}

export function PharmaciesPage() {
  const [rows, setRows] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [communeFilter, setCommuneFilter] = useState<string>('__all__');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase.from('pharmacies').select('*').order('name', { ascending: true });
    if (communeFilter !== '__all__') {
      q = q.eq('commune', communeFilter);
    }
    if (search.trim().length > 0) {
      const t = `%${search.trim()}%`;
      q = q.or(`name.ilike.${t},address.ilike.${t},phone_primary.ilike.${t}`);
    }
    const { data, error: err } = await q;
    if (err !== null) {
      setError(err.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [communeFilter, search]);

  useEffect(() => {
    const h = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(h);
  }, [load]);

  const filteredLabel = useMemo(
    () => (loading ? 'Chargement…' : `${rows.length} pharmacie(s)`),
    [loading, rows.length],
  );

  /** Inclut les communes déjà en base (anciennes saisies) même si absentes de la liste nationale. */
  const communesForTableFilter = useMemo(() => {
    const set = new Set<string>(COTE_IVOIRE_COMMUNES);
    for (const r of rows) {
      set.add(r.commune);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [rows]);

  const communesForFormSelect = useMemo(() => {
    const set = new Set<string>(COTE_IVOIRE_COMMUNES);
    const v = form.commune.trim();
    if (v.length > 0) {
      set.add(v);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [form.commune]);

  function openCreate() {
    setForm(emptyForm());
    setPhotoFile(null);
    setDialogOpen(true);
  }

  function openEdit(row: Pharmacy) {
    setForm(fromRow(row));
    setPhotoFile(null);
    setDialogOpen(true);
  }

  async function uploadPhoto(pharmacyId: string): Promise<string | null> {
    if (photoFile === null) return null;
    const safe = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${pharmacyId}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from(PHARMACY_PHOTOS_BUCKET)
      .upload(path, photoFile, { upsert: true });
    if (upErr !== null) throw upErr;
    const { data } = supabase.storage.from(PHARMACY_PHOTOS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const pharmacyId = form.id ?? crypto.randomUUID();
    try {
      let photoUrl = form.photo_url.trim() === '' ? null : form.photo_url.trim();
      if (photoFile !== null) {
        const uploaded = await uploadPhoto(pharmacyId);
        if (uploaded !== null) photoUrl = uploaded;
      }

      const payload: PharmacyInsert = {
        id: form.id ?? pharmacyId,
        name: form.name.trim(),
        address: form.address.trim(),
        commune: form.commune.trim(),
        city: form.city.trim() || 'Abidjan',
        latitude: String(form.latitude),
        longitude: String(form.longitude),
        phone_primary: form.phone_primary.trim(),
        phone_secondary: form.phone_secondary.trim() === '' ? null : form.phone_secondary.trim(),
        pharmacist_name: form.pharmacist_name.trim() === '' ? null : form.pharmacist_name.trim(),
        photo_url: photoUrl,
        accepted_insurance: parseListInput(form.accepted_insurance),
        accepted_mobile_money: parseListInput(form.accepted_mobile_money),
        rating: form.rating.trim() === '' ? '0' : form.rating.trim(),
        review_count: Number.isFinite(form.review_count) ? form.review_count : 0,
        is_active: form.is_active,
      };

      if (form.id === null) {
        const { error: insErr } = await supabase.from('pharmacies').insert(payload);
        if (insErr !== null) throw insErr;
      } else {
        const { id: _rowId, ...update } = payload;
        void _rowId;
        const { error: updErr } = await supabase
          .from('pharmacies')
          .update(update)
          .eq('id', form.id);
        if (updErr !== null) throw updErr;
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={Building2}
        title="Pharmacies"
        code="A-01"
        description="CRUD, photo, carte GPS."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Liste</CardTitle>
            <p className="text-sm text-muted-foreground">{filteredLabel}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Recherche (nom, adresse, téléphone)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={communeFilter} onValueChange={setCommuneFilter}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Commune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les communes</SelectItem>
                {communesForTableFilter.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error !== null ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/30 py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/70" strokeWidth={1.5} aria-hidden />
              <p className="text-sm text-muted-foreground">Aucune pharmacie.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Commune</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.commune}</TableCell>
                      <TableCell>{r.phone_primary}</TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? 'default' : 'secondary'}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-3xl overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{form.id === null ? 'Nouvelle pharmacie' : 'Modifier la pharmacie'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Commune</Label>
              <Select
                value={form.commune}
                onValueChange={(v) => setForm((f) => ({ ...f, commune: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communesForFormSelect.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_primary">Téléphone principal</Label>
              <Input
                id="phone_primary"
                value={form.phone_primary}
                onChange={(e) => setForm((f) => ({ ...f, phone_primary: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_secondary">Téléphone secondaire</Label>
              <Input
                id="phone_secondary"
                value={form.phone_secondary}
                onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pharmacist_name">Titulaire</Label>
              <Input
                id="pharmacist_name"
                value={form.pharmacist_name}
                onChange={(e) => setForm((f) => ({ ...f, pharmacist_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="insurance">Assurances acceptées (séparées par virgule)</Label>
              <Input
                id="insurance"
                value={form.accepted_insurance}
                onChange={(e) => setForm((f) => ({ ...f, accepted_insurance: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mm">Mobile money (séparés par virgule)</Label>
              <Input
                id="mm"
                value={form.accepted_mobile_money}
                onChange={(e) => setForm((f) => ({ ...f, accepted_mobile_money: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Note (décimal)</Label>
              <Input
                id="rating"
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review_count">Nombre d’avis</Label>
              <Input
                id="review_count"
                type="number"
                min={0}
                value={form.review_count}
                onChange={(e) =>
                  setForm((f) => ({ ...f, review_count: Number.parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
            <div className="flex flex-row items-center gap-2 md:col-span-2">
              <Checkbox
                id="active"
                checked={form.is_active}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_active: c === true }))}
              />
              <Label htmlFor="active">Pharmacie active</Label>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photo_url">URL photo (facultatif si upload)</Label>
              <Input
                id="photo_url"
                value={form.photo_url}
                onChange={(e) => setForm((f) => ({ ...f, photo_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="photo_file">Upload photo façade → Storage</Label>
              <Input
                id="photo_file"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="md:col-span-2">
              <MapPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onPositionChange={(lat, lng) =>
                  setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
