import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-clinic-gradient px-4 text-center text-foreground">
      <div className="max-w-md space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">ClinicOS</p>
        <h1 className="text-3xl font-semibold text-white">Page not found</h1>
        <p className="text-slate-300">The route you requested does not exist. Return to the dashboard to continue.</p>
        <Button asChild>
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}