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
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 text-sm text-muted-foreground">
        Vérification du profil…
      </div>
    );
  }

  if (!loading && session !== null && !profileLoading && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/40 p-4">
        <p className="text-center text-sm text-destructive">
          Accès refusé : ce compte n’a pas le rôle administrateur.
        </p>
        <Button variant="outline" onClick={() => void signOut()}>
          Déconnexion
        </Button>
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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connexion administrateur</CardTitle>
          <p className="text-sm text-muted-foreground">
            Email et mot de passe (Supabase Auth). Le profil doit avoir{' '}
            <code className="rounded bg-muted px-1">role = admin</code>.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error !== null ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
