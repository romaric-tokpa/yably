import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import type { PharmacyStat } from '@/types/database';

export function StatsPage() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ date: string; recherches: number }[]>([]);
  const [top10, setTop10] = useState<{ pharmacy_id: string; name: string; vues: number }[]>([]);
  const [verifRate, setVerifRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const since = subDays(new Date(), 30).toISOString();
    const statSince = format(subDays(new Date(), 14), 'yyyy-MM-dd');
    const statWeek = format(subDays(new Date(), 7), 'yyyy-MM-dd');

    try {
      const [cProf, verifs, stats, pharmRows] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('verifications').select('user_id').gte('created_at', since),
        supabase.from('pharmacy_stats').select('*').gte('date', statSince),
        supabase.from('pharmacies').select('id, name'),
      ]);

      if (cProf.error !== null) throw cProf.error;
      setTotalUsers(cProf.count ?? 0);

      if (verifs.error !== null) throw verifs.error;
      const uidSet = new Set((verifs.data ?? []).map((v) => v.user_id));
      setActiveUsers(uidSet.size);

      if (stats.error !== null) throw stats.error;
      const list = (stats.data ?? []) as PharmacyStat[];

      const byDay = new Map<string, number>();
      const byPharm = new Map<string, number>();
      let sumViewsPeriod = 0;
      let sumVerifRecv = 0;

      for (const s of list) {
        byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.views);
        byPharm.set(s.pharmacy_id, (byPharm.get(s.pharmacy_id) ?? 0) + s.views);
        if (s.date >= statWeek) {
          sumViewsPeriod += s.views;
          sumVerifRecv += s.verifications_received;
        }
      }

      const daysSorted = [...byDay.keys()].sort();
      setChartData(
        daysSorted.map((d) => ({
          date: format(new Date(d + 'T12:00:00'), 'dd MMM', { locale: fr }),
          recherches: byDay.get(d) ?? 0,
        })),
      );

      if (pharmRows.error !== null) throw pharmRows.error;
      const names = new Map((pharmRows.data ?? []).map((p) => [p.id, p.name]));

      const top = [...byPharm.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pharmacy_id, vues]) => ({
          pharmacy_id,
          name: names.get(pharmacy_id) ?? pharmacy_id.slice(0, 8),
          vues,
        }));
      setTop10(top);

      if (sumViewsPeriod > 0) {
        setVerifRate((sumVerifRecv / sumViewsPeriod) * 100);
      } else {
        setVerifRate(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur chargement stats';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rateLabel = useMemo(() => {
    if (verifRate === null) return '—';
    return `${verifRate.toFixed(1)} % (7 j.)`;
  }, [verifRate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiques</h1>
        <p className="text-sm text-muted-foreground">A-04 — Agrégats Supabase (14–30 j.).</p>
      </div>

      {error !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Utilisateurs (profils)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{totalUsers ?? '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Actifs (30 j.)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{activeUsers ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  Ayant au moins une vérification sur la période
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taux vérif. / vues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{rateLabel}</p>
                <p className="text-xs text-muted-foreground">
                  Σ verifications_received / Σ views (pharmacy_stats)
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recherches par jour (vues fiches)</CardTitle>
              <p className="text-sm text-muted-foreground">14 derniers jours</p>
            </CardHeader>
            <CardContent className="h-[320px]">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pas de données pharmacy_stats.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="recherches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top 10 pharmacies consultées</CardTitle>
              <p className="text-sm text-muted-foreground">Cumul vues sur 14 jours</p>
            </CardHeader>
            <CardContent>
              {top10.length === 0 ? (
                <p className="text-sm text-muted-foreground">Pas de données.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Pharmacie</TableHead>
                      <TableHead className="text-right">Vues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top10.map((row, i) => (
                      <TableRow key={row.pharmacy_id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">{row.vues}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
