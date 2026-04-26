import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Pill,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/pharmacies', label: 'Pharmacies', icon: Building2 },
  { to: '/gardes', label: 'Gardes', icon: Pill },
  { to: '/verifications', label: 'Vérifications', icon: ShieldCheck },
  { to: '/stats', label: 'Statistiques', icon: LayoutDashboard },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-brand-orange-muted/40">
      <aside className="flex w-60 flex-col rounded-r-3xl border-r border-border/80 bg-card shadow-soft">
        <div className="flex items-center gap-3 border-b border-border/70 px-4 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <ClipboardList className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold leading-tight text-foreground">Admin</div>
            <div className="truncate text-xs text-muted-foreground">Pharmacies de garde</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navigation principale">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <Separator />
        <div className="p-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/60 px-2 py-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="truncate text-xs text-muted-foreground" title={user?.email}>
              {user?.email ?? '—'}
            </p>
          </div>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container max-w-7xl p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AdminHomeLink() {
  return (
    <Link to="/pharmacies" className="text-primary hover:underline">
      Pharmacies
    </Link>
  );
}
