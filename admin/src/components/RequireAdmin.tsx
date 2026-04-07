import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, profileLoading, isAdmin } = useAuth();

  if (loading || (session !== null && profileLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 text-sm text-muted-foreground">
        Chargement…
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
