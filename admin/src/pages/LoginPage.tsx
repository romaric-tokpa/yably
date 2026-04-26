import { KeyRound, Loader2, Lock, Mail, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { session, loading, profileLoading, isAdmin, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session !== null && !profileLoading && isAdmin) {
    return <Navigate to="/pharmacies" replace />;
  }

  if (!loading && session !== null && profileLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-br from-background via-primary/[0.02] to-brand-orange-muted/40 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <span>Vérification du profil…</span>
      </div>
    );
  }

  if (!loading && session !== null && !profileLoading && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-background via-primary/[0.02] to-brand-orange-muted/40 p-4">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border/80 bg-card px-6 py-8 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldOff className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <p className="text-sm text-destructive">
            Accès refusé : ce compte n’a pas le rôle administrateur.
          </p>
          <Button variant="outline" className="rounded-xl" onClick={() => void signOut()}>
            Déconnexion
          </Button>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err !== null) {
      setError(err.message);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/[0.02] to-brand-orange-muted/40 p-4">
      <Card className="w-full max-w-md rounded-2xl border-border/80 shadow-soft">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                Connexion administrateur
                <ShieldCheck className="h-4 w-4 text-brand-orange" strokeWidth={2} aria-hidden />
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Email et mot de passe (Supabase Auth). Le profil doit avoir{' '}
                <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">role = admin</code>.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
