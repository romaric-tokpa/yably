import { addWeeks, eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, FileUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [pharmacies, setPharmacies] = useState<Pick<Pharmacy, 'id' | 'name'>[]>([]);
  const [gardes, setGardes] = useState<Garde[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staging, setStaging] = useState<StagingRow[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);

  const [manualPid, setManualPid] = useState('');
  const [manualStart, setManualStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manualEnd, setManualEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [manual24, setManual24] = useState(false);
  const [manualSource, setManualSource] = useState('admin');

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const loadPharmacies = useCallback(async () => {
    const { data, error: err } = await supabase.from('pharmacies').select('id, name').order('name');
    if (err === null && data !== null) setPharmacies(data);
  }, []);

  const loadGardes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = format(weekStart, 'yyyy-MM-dd');
    const to = format(weekEnd, 'yyyy-MM-dd');
    const { data, error: err } = await supabase
      .from('gardes')
      .select('*')
      .lte('start_date', to)
      .gte('end_date', from);
    if (err !== null) {
      setError(err.message);
      setGardes([]);
    } else {
      setGardes(data ?? []);
    }
    setLoading(false);
  }, [weekStart, weekEnd]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gardes</h1>
        <p className="text-sm text-muted-foreground">A-02 — Calendrier, import CSV, OCR (placeholder).</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Semaine du {format(weekStart, 'd MMM yyyy', { locale: fr })}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semaine précédente"
              onClick={() => setWeekStart((d) => addWeeks(d, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Semaine suivante"
              onClick={() => setWeekStart((d) => addWeeks(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
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
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((day) => {
                const list = gardesForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-[140px] rounded-md border bg-card p-2 text-xs"
                  >
                    <div className="font-semibold">
                      {format(day, 'EEE d', { locale: fr })}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {list.length === 0 ? (
                        <li className="text-muted-foreground">—</li>
                      ) : (
                        list.map((g) => (
                          <li key={g.id} className="rounded bg-muted/50 px-1 py-0.5">
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
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import &amp; validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
                <p className="text-xs text-amber-700 dark:text-amber-400">{ocrHint}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border p-4">
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
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">
                  Lignes importées ({staging.length}) — validation manuelle
                </h3>
                <Button type="button" onClick={() => void commitApproved()}>
                  Enregistrer les lignes cochées
                </Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
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
                    {staging.map((r) => (
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune ligne en attente.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
