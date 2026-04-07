import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Pill,
  ShieldCheck,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/pharmacies', label: 'Pharmacies', icon: Building2, code: 'A-01' },
  { to: '/gardes', label: 'Gardes', icon: Pill, code: 'A-02' },
  { to: '/verifications', label: 'Vérifications', icon: ShieldCheck, code: 'A-03' },
  { to: '/stats', label: 'Statistiques', icon: LayoutDashboard, code: 'A-04' },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="flex w-56 flex-col border-r bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <ClipboardList className="h-6 w-6 text-primary" />
          <div>
            <div className="text-sm font-bold leading-tight">Admin</div>
            <div className="text-xs text-muted-foreground">Pharmacies garde</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon, code }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <span className="text-[10px] opacity-70">{code}</span>
            </NavLink>
          ))}
        </nav>
        <Separator />
        <div className="p-3">
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground" title={user?.email}>
            {user?.email ?? '—'}
          </p>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container max-w-7xl p-6">
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
