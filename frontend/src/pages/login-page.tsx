import { ShieldCheck, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-clinic-gradient px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge className="w-fit bg-white/10 text-white">Secure medical operations platform</Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Run the clinic with a single, role-aware command center.
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Authenticate staff, manage patient flow, and keep the front desk, doctors, and administration aligned in one responsive workspace.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium text-white">JWT + bcrypt security</p>
              <p className="mt-2 text-sm text-slate-300">Server-side auth is ready for token-based sessions and role enforcement.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <Stethoscope className="h-5 w-5 text-accent" />
              <p className="mt-3 font-medium text-white">Built for medical workflows</p>
              <p className="mt-2 text-sm text-slate-300">Appointments, patient records, and audit logs are first-class domain models.</p>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-slate-950/70 shadow-glow backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your ClinicOS admin, doctor, or receptionist account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="you@clinic.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="password">Password</label>
              <Input id="password" type="password" placeholder="Enter your password" />
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Protected via API</span>
              <Link to="/dashboard" className="text-primary hover:underline">
                Skip to dashboard
              </Link>
            </div>
            <Button className="w-full">Sign in</Button>
            <p className="text-center text-sm text-slate-400">
              Frontend is scaffolded for the backend auth endpoints and Caddy-proxied `/api` base path.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}