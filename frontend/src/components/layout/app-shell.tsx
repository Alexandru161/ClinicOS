import { CalendarDays, ClipboardList, HeartPulse, LayoutDashboard, LogOut, Settings2, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/records', label: 'Records', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings2 }
];

export function AppShell() {
  return (
    <div className="min-h-screen bg-clinic-gradient text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/55 px-6 py-5 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:w-80 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-soft">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">ClinicOS</p>
              <p className="text-lg font-semibold">Clinic management suite</p>
            </div>
          </div>

          <Separator className="my-6 bg-white/10" />

          <nav className="grid gap-2">
            {navigationItems.map((item) => {
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
            <p className="mt-2 text-sm text-slate-300">You have receptionist permissions to manage patients, appointments, and clinic operations.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">RECEPTIONIST</Badge>
            </div>
          </div>

          <div className="mt-auto hidden lg:block">
            <Button asChild variant="subtle" className="mt-6 w-full justify-start">
              <Link to="/login">
                <LogOut className="h-4 w-4" />
                Sign out
              </Link>
            </Button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}