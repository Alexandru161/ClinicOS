import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Settings2, Users, Shield } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { clearAuthSession, getAuthUser } from '@/lib/auth-session';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];

const adminNavigationItems = [
  { to: '/admin', label: 'Admin panel', icon: Shield }
];

export function AppShell() {
  const authUser = getAuthUser();
  const roleLabel = authUser?.role ?? 'RECEPTIONIST';
  const isAdmin = roleLabel === 'ADMIN';

  const roleDescription =
    roleLabel === 'DOCTOR'
      ? 'You have doctor permissions to search patients and review records.'
      : roleLabel === 'ADMIN'
        ? 'You have admin permissions for platform and staff governance.'
        : 'You have receptionist permissions to manage patients, appointments, and clinic operations.';

  const items = isAdmin ? [...navigationItems, ...adminNavigationItems] : navigationItems;

  return (
    <div className="min-h-screen overflow-x-hidden bg-clinic-gradient text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] min-w-0 flex-col overflow-x-hidden lg:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/55 px-6 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-80 lg:flex-col lg:border-b-0 lg:border-r">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-2xl transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/60"
            aria-label="Go to dashboard"
          >
            <img src="/clinicos-logo.svg" alt="ClinicOS" className="h-14 w-14 shrink-0 rounded-full shadow-soft" />
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">ClinicOS</p>
              <p className="text-lg font-semibold">Clinic management suite</p>
            </div>
          </Link>

          <Separator className="my-6 bg-white/10" />

          <nav className="grid gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-white/10 text-white shadow-soft' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-white">Your access level</p>
            <p className="mt-2 text-sm text-slate-300">{roleDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">{roleLabel}</Badge>
            </div>
          </div>

          <div className="mt-auto hidden lg:block">
            <Button asChild variant="subtle" className="mt-6 w-full justify-start">
              <Link
                to="/login"
                onClick={() => {
                  clearAuthSession();
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Link>
            </Button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
