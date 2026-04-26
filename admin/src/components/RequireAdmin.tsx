import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, profileLoading, isAdmin } = useAuth();

  if (loading || (session !== null && profileLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-br from-background via-primary/[0.02] to-brand-orange-muted/40 text-sm text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <span>Chargement…</span>
      </div>
    );
  }

  if (session === null) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
