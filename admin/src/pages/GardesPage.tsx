import { addWeeks, eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Moon,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AdminPageHeader } from '@/components/AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { supabase } from '@/lib/supabase';
import type { Garde, Pharmacy } from '@/types/database';

type StagingRow = {
  key: string;
  pharmacy_id: string;
  start_date: string;
  end_date: string;
  is_24h: boolean;
  source: string;
  approve: boolean;
};

function parseBoolCell(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'oui' || s === 'yes';
}

/** CSV attendu : pharmacy_id,start_date,end_date,is_24h,source */
function parseCsv(text: string): Omit<StagingRow, 'key' | 'approve'>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const col = (name: string): number => header.indexOf(name);
  const iPid = col('pharmacy_id');
  const iStart = col('start_date');
  const iEnd = col('end_date');
  const i24 = col('is_24h');
  const iSrc = col('source');
  if (iPid < 0 || iStart < 0 || iEnd < 0 || iSrc < 0) return [];
  const out: Omit<StagingRow, 'key' | 'approve'>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(',').map((c) => c.trim());
    if (cells.length < 3) continue;
    out.push({
      pharmacy_id: cells[iPid] ?? '',
      start_date: cells[iStart] ?? '',
      end_date: cells[iEnd] ?? '',
      is_24h: i24 >= 0 ? parseBoolCell(cells[i24] ?? 'false') : false,
      source: cells[iSrc] ?? 'admin',
    });
  }
  return out;
}

export function GardesPage() {
  const initialMonday = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  /** Semaine affichée (titre, grille, stats) — mise à jour seulement quand les gardes sont chargées. */
  const [displayWeekStart, setDisplayWeekStart] = useState<Date>(initialMonday);
  /** Semaine demandée (navigation) — peut être en avance sur l’affichage pendant le fetch. */
  const [fetchWeekStart, setFetchWeekStart] = useState<Date>(initialMonday);
  const displayWeekStartRef = useRef(displayWeekStart);
  displayWeekStartRef.current = displayWeekStart;
  const gardesRequestIdRef = useRef(0);

  const [pharmacies, setPharmacies] = useState<Pick<Pharmacy, 'id' | 'name'>[]>([]);
  const [gardes, setGardes] = useState<Garde[]>([]);
  /** Premier chargement uniquement : évite de remplacer le calendrier par « Chargement… » lors des semaines suivantes. */
  const [initialGardesLoading, setInitialGardesLoading] = useState(true);
  const [gardesRefreshing, setGardesRefreshing] = useState(false);
  const gardesFirstLoadDoneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [staging, setStaging] = useState<StagingRow[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const [manualPid, setManualPid] = useState('');
  const [manualStart, setManualStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualEnd, setManualEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manual24, setManual24] = useState(false);
  const [manualSource, setManualSource] = useState('admin');
  const [stagingSearch, setStagingSearch] = useState('');
  const [stagingSourceFilter, setStagingSourceFilter] = useState<'all' | string>('all');
  const [staging24hFilter, setStaging24hFilter] = useState<'all' | 'yes' | 'no'>('all');

  const displayWeekEnd = endOfWeek(displayWeekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: displayWeekStart, end: displayWeekEnd });
  const approvedCount = staging.filter((row) => row.approve).length;

  const loadPharmacies = useCallback(async () => {
    const { data, error: err } = await supabase.from('pharmacies').select('id, name').order('name');
    if (err === null && data !== null) setPharmacies(data);
  }, []);

  const loadGardes = useCallback(async () => {
    const requestId = ++gardesRequestIdRef.current;
    if (gardesFirstLoadDoneRef.current) {
      setGardesRefreshing(true);
    }
    const rangeStart = startOfWeek(fetchWeekStart, { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(rangeStart, { weekStartsOn: 1 });
    const from = format(rangeStart, 'yyyy-MM-dd');
    const to = format(rangeEnd, 'yyyy-MM-dd');
    try {
      const { data, error: err } = await supabase
        .from('gardes')
        .select('*')
        .lte('start_date', to)
        .gte('end_date', from);
      if (requestId !== gardesRequestIdRef.current) {
        return;
      }
      if (err !== null) {
        setError(err.message);
        setFetchWeekStart(displayWeekStartRef.current);
      } else {
        setError(null);
        setGardes(data ?? []);
        setDisplayWeekStart(rangeStart);
        setFetchWeekStart(rangeStart);
      }
    } finally {
      if (requestId === gardesRequestIdRef.current) {
        if (!gardesFirstLoadDoneRef.current) {
          gardesFirstLoadDoneRef.current = true;
          setInitialGardesLoading(false);
        }
        setGardesRefreshing(false);
      }
    }
  }, [fetchWeekStart]);

  useEffect(() => {
    void loadPharmacies();
  }, [loadPharmacies]);

  useEffect(() => {
    void loadGardes();
  }, [loadGardes]);

  const pharmacyName = useMemo(() => {
    const m = new Map(pharmacies.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [pharmacies]);

  function gardesForDay(day: Date): Garde[] {
    const d = format(day, 'yyyy-MM-dd');
    return gardes.filter((g) => d >= g.start_date && d <= g.end_date);
  }

  const totalWeekSlots = useMemo(() => gardes.length, [gardes]);
  const total24h = useMemo(() => gardes.filter((g) => g.is_24h).length, [gardes]);
  const coveredDays = useMemo(
    () =>
      days.filter((day) => {
        const d = format(day, 'yyyy-MM-dd');
        return gardes.some((g) => d >= g.start_date && d <= g.end_date);
      }).length,
    [days, gardes],
  );
  const sourceOptions = useMemo(
    () =>
      Array.from(new Set(staging.map((row) => row.source.trim()).filter((s) => s.length > 0))).sort(
        (a, b) => a.localeCompare(b, 'fr'),
      ),
    [staging],
  );
  const filteredStaging = useMemo(() => {
    const q = stagingSearch.trim().toLowerCase();
    return staging.filter((row) => {
      if (stagingSourceFilter !== 'all' && row.source !== stagingSourceFilter) {
        return false;
      }
      if (staging24hFilter === 'yes' && !row.is_24h) return false;
      if (staging24hFilter === 'no' && row.is_24h) return false;
      if (q.length === 0) return true;
      const name = pharmacyName(row.pharmacy_id).toLowerCase();
      return (
        name.includes(q) ||
        row.source.toLowerCase().includes(q) ||
        row.start_date.includes(q) ||
        row.end_date.includes(q)
      );
    });
  }, [staging, stagingSearch, stagingSourceFilter, staging24hFilter, pharmacyName]);

  function onCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseCsv(text);
      setStaging(
        parsed.map((r) => ({
          ...r,
          key: crypto.randomUUID(),
          approve: false,
        })),
      );
    };
    reader.readAsText(file);
  }

  function addManualStaging() {
    if (manualPid === '') {
      setError('Choisir une pharmacie.');
      return;
    }
    setError(null);
    setStaging((s) => [
      ...s,
      {
        key: crypto.randomUUID(),
        pharmacy_id: manualPid,
        start_date: manualStart,
        end_date: manualEnd,
        is_24h: manual24,
        source: manualSource,
        approve: false,
      },
    ]);
  }

  async function commitApproved() {
    const toInsert = staging.filter((r) => r.approve);
    if (toInsert.length === 0) {
      setError('Cochez au moins une ligne validée.');
      return;
    }
    setError(null);
    const rows = toInsert.map((r) => ({
      pharmacy_id: r.pharmacy_id,
      start_date: r.start_date,
      end_date: r.end_date,
      is_24h: r.is_24h,
      source: r.source,
      verified_by_admin: true,
    }));
    const { error: err } = await supabase.from('gardes').insert(rows);
    if (err !== null) {
      setError(err.message);
      return;
    }
    setStaging((s) => s.filter((r) => !r.approve));
    await loadGardes();
  }

  function runOcrPlaceholder() {
    setOcrHint(
      pdfFile !== null
        ? `Fichier « ${pdfFile.name} » : extraction Google Vision non branchée (Edge Function / clé API à configurer).`
        : 'Sélectionnez un PDF avant l’extraction OCR.',
    );
  }

  function setApprovalForFilteredRows(next: boolean) {
    const keys = new Set(filteredStaging.map((row) => row.key));
    setStaging((rows) => rows.map((row) => (keys.has(row.key) ? { ...row, approve: next } : row)));
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={CalendarDays}
        title="Gardes"
        code="A-02"
        description="Calendrier, import CSV, OCR (placeholder)."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/5 to-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gardes semaine
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">{totalWeekSlots}</p>
              <CalendarDays className="h-5 w-5 text-primary" aria-hidden />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Couverture des jours
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">{coveredDays}/7</p>
              <ShieldCheck className="h-5 w-5 text-brand-orange" aria-hidden />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Gardes 24h
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">{total24h}</p>
              <Moon className="h-5 w-5 text-primary" aria-hidden />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              En attente validation
            </p>
            <div className="mt-2 flex items-end justify-between">
              <p className="text-3xl font-bold text-foreground">{staging.length}</p>
              <UploadCloud className="h-5 w-5 text-brand-orange" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-4 border-b bg-muted/30 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xl">
              Semaine du {format(displayWeekStart, 'd MMM yyyy', { locale: fr })}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue calendrier des gardes planifiées, avec statut jour par jour.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semaine précédente"
              onClick={() => setFetchWeekStart((d) => addWeeks(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semaine suivante"
              onClick={() => setFetchWeekStart((d) => addWeeks(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {error !== null ? (
            <p className="mb-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {initialGardesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy="true">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Chargement du calendrier…
            </div>
          ) : (
            <div className="relative">
              {gardesRefreshing ? (
                <div
                  className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/55 pt-8 backdrop-blur-[1px]"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                    Actualisation…
                  </span>
                </div>
              ) : null}
              <div
                className={gardesRefreshing ? 'grid gap-3 opacity-60 transition-opacity md:grid-cols-7' : 'grid gap-3 md:grid-cols-7'}
              >
                {days.map((day) => {
                  const list = gardesForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className="min-h-[160px] rounded-2xl border border-border/80 bg-card p-3 text-xs shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{format(day, 'EEE d', { locale: fr })}</div>
                        <Badge variant="outline" className="text-[10px]">
                          {list.length}
                        </Badge>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {list.length === 0 ? (
                          <li className="flex items-center gap-1 text-muted-foreground">
                            <Moon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                            Aucune
                          </li>
                        ) : (
                          list.map((g) => (
                            <li key={g.id} className="rounded-lg bg-muted/60 px-2 py-1">
                              <span className="line-clamp-2">{pharmacyName(g.pharmacy_id)}</span>
                              <Badge variant="outline" className="mt-1 text-[10px]">
                                {g.is_24h ? '24h' : 'Nuit'}
                              </Badge>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Import &amp; validation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Importez, relisez puis validez les lignes avant insertion en base.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4">
              <Label htmlFor="csv">Import CSV</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f !== undefined) onCsvFile(f);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Colonnes : pharmacy_id, start_date, end_date, is_24h, source
              </p>
            </div>
            <div className="space-y-2 rounded-2xl border border-border/80 bg-card p-4">
              <Label htmlFor="pdf">PDF officiel</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="pdf"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="secondary" onClick={runOcrPlaceholder}>
                  <FileUp className="mr-2 h-4 w-4" />
                  Extraire via OCR
                </Button>
              </div>
              {ocrHint !== null ? (
                <p className="text-xs text-brand-orange">{ocrHint}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
            <h3 className="mb-3 text-sm font-medium">Saisie manuelle (file d’attente)</h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2 md:col-span-2">
                <Label>Pharmacie</Label>
                <Select value={manualPid} onValueChange={setManualPid}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir…" />
                  </SelectTrigger>
                  <SelectContent>
                    {pharmacies.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="d1">Début</Label>
                <Input
                  id="d1"
                  type="date"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d2">Fin</Label>
                <Input
                  id="d2"
                  type="date"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Checkbox
                  id="g24"
                  checked={manual24}
                  onCheckedChange={(c) => setManual24(c === true)}
                />
                <Label htmlFor="g24">24h</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="src">Source</Label>
                <Input
                  id="src"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                />
              </div>
            </div>
            <Button type="button" className="mt-3" variant="outline" onClick={addManualStaging}>
              Ajouter à la file
            </Button>
          </div>

          {staging.length > 0 ? (
            <div className="space-y-3">
              <div className="mb-2 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <h3 className="text-sm font-medium xl:min-w-[280px]">
                  Lignes importées ({staging.length}) — validation manuelle
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 xl:flex">
                  <Input
                    value={stagingSearch}
                    onChange={(e) => setStagingSearch(e.target.value)}
                    placeholder="Rechercher pharmacie, source, date…"
                    className="xl:w-72"
                  />
                  <Select
                    value={stagingSourceFilter}
                    onValueChange={(value) => setStagingSourceFilter(value)}
                  >
                    <SelectTrigger className="xl:w-48">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les sources</SelectItem>
                      {sourceOptions.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={staging24hFilter}
                    onValueChange={(value: 'all' | 'yes' | 'no') => setStaging24hFilter(value)}
                  >
                    <SelectTrigger className="xl:w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="yes">24h uniquement</SelectItem>
                      <SelectItem value="no">Nuit uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setApprovalForFilteredRows(true)}>
                  Tout cocher (filtre)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setApprovalForFilteredRows(false)}>
                  Tout décocher (filtre)
                </Button>
                <Button
                  type="button"
                  onClick={() => void commitApproved()}
                  disabled={approvedCount === 0}
                  size="sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enregistrer les lignes cochées
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {approvedCount} ligne(s) cochée(s) prêtes à être enregistrées. {filteredStaging.length}{' '}
                ligne(s) visibles avec les filtres actuels.
              </p>
              <div className="overflow-x-auto rounded-2xl border border-border/80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">OK</TableHead>
                      <TableHead>Pharmacie</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>24h</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaging.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell>
                          <Checkbox
                            checked={r.approve}
                            onCheckedChange={(c) =>
                              setStaging((rows) =>
                                rows.map((x) =>
                                  x.key === r.key ? { ...x, approve: c === true } : x,
                                ),
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>{pharmacyName(r.pharmacy_id)}</TableCell>
                        <TableCell>{r.start_date}</TableCell>
                        <TableCell>{r.end_date}</TableCell>
                        <TableCell>{r.is_24h ? 'oui' : 'non'}</TableCell>
                        <TableCell>{r.source}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredStaging.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun résultat pour les filtres/recherche sélectionnés.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune ligne en attente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
