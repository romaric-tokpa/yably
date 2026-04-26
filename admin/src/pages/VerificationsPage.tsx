import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Inbox, Loader2, MapPinOff, ShieldCheck, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { AdminPageHeader } from '@/components/AdminPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { VerificationStatus } from '@/types/database';

type VerificationWithPharmacy = {
  id: string;
  pharmacy_id: string;
  user_id: string;
  status: VerificationStatus;
  user_latitude: string | null;
  user_longitude: string | null;
  distance_to_pharmacy: number | null;
  created_at: string;
  pharmacies: { name: string } | null;
};

export function VerificationsPage() {
  const [rows, setRows] = useState<VerificationWithPharmacy[]>([]);
  const [pharmacies, setPharmacies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPharmacy, setFilterPharmacy] = useState<string>('__all__');
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPharmacies = useCallback(async () => {
    const { data } = await supabase.from('pharmacies').select('id, name').order('name');
    if (data !== null) setPharmacies(data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let q = supabase
      .from('verifications')
      .select(
        'id, pharmacy_id, user_id, status, user_latitude, user_longitude, distance_to_pharmacy, created_at, pharmacies(name)',
      )
      .order('created_at', { ascending: false })
      .limit(300);
    if (filterPharmacy !== '__all__') {
      q = q.eq('pharmacy_id', filterPharmacy);
    }
    if (filterStatus !== '__all__') {
      q = q.eq('status', filterStatus as VerificationStatus);
    }
    const { data, error: err } = await q;
    if (err !== null) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data ?? []) as VerificationWithPharmacy[]);
    }
    setLoading(false);
  }, [filterPharmacy, filterStatus]);

  useEffect(() => {
    void loadPharmacies();
  }, [loadPharmacies]);

  useEffect(() => {
    void load();
  }, [load]);

  async function removeRow(id: string) {
    setDeletingId(id);
    setError(null);
    const { error: err } = await supabase.from('verifications').delete().eq('id', id);
    setDeletingId(null);
    if (err !== null) {
      setError(err.message);
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        icon={ShieldCheck}
        title="Vérifications"
        code="A-03"
        description="Contrôle communautaire ; suppression des entrées suspectes."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Récentes</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={filterPharmacy} onValueChange={setFilterPharmacy}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Pharmacie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes</SelectItem>
                {pharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="sm:w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Tous</SelectItem>
                <SelectItem value="open">Ouvert</SelectItem>
                <SelectItem value="closed">Fermé</SelectItem>
              </SelectContent>
            </Select>
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
              <p className="text-sm text-muted-foreground">Aucune vérification.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Distance (m)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(r.created_at), 'Pp', { locale: fr })}
                      </TableCell>
                      <TableCell>{r.pharmacies?.name ?? r.pharmacy_id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'open' ? 'default' : 'secondary'}>
                          {r.status === 'open' ? 'Ouvert' : 'Fermé'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.distance_to_pharmacy !== null ? (
                          String(r.distance_to_pharmacy)
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <MapPinOff className="h-3.5 w-3.5" aria-hidden />
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={deletingId === r.id}
                          onClick={() => void removeRow(r.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Supprimer
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
    </div>
  );
}
