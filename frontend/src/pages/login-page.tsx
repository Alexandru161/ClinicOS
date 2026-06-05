import { CalendarDays, ShieldCheck } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { setAuthSession } from '@/lib/auth-session';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload = await login({ email, password });
      setAuthSession(payload);
      navigate('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-clinic-gradient px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Badge className="w-fit bg-white/10 text-white">ClinicOS</Badge>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Manage the clinic from one clear workspace.
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Sign in to manage patients, appointments, clinical records, and daily clinic work.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 font-medium text-white">Protected staff access</p>
              <p className="mt-2 text-sm text-slate-300">Each employee sees the tools and information allowed for their role.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <CalendarDays className="h-5 w-5 text-accent" />
              <p className="mt-3 font-medium text-white">Daily clinic workflow</p>
              <p className="mt-2 text-sm text-slate-300">Appointments, patient cards, and medical notes stay in one place.</p>
            </div>
          </div>
        </div>

        <Card className="border-white/10 bg-slate-950/70 shadow-glow backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your ClinicOS admin, doctor, or receptionist account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={submitLogin}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="email">Email</label>
                <Input id="email" type="email" placeholder="you@clinic.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="password">Password</label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
              <Button className="w-full" type="submit" disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign in'}</Button>
              <p className="text-center text-sm text-slate-400">                Don't have an account?{' '}
                <Link to="/register" className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
              <p className="text-center text-sm text-slate-400">Use the staff email and password issued by the clinic.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
