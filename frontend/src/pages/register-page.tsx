import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { register } from '@/api/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { setAuthSession, getAuthUser } from '@/lib/auth-session';

export function RegisterPage() {
  const navigate = useNavigate();
  const authUser = getAuthUser();

  // Only allow bootstrap registration or admin to register new users
  const canRegister = !authUser || authUser.role === 'ADMIN';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR' | 'RECEPTIONIST'>('RECEPTIONIST');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submitRegister = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = await register({ email, password, fullName, role });
      setAuthSession(payload);
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate(authUser ? '/dashboard' : '/dashboard');
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!canRegister) {
    return (
      <div className="min-h-screen bg-clinic-gradient px-4 py-8 text-foreground">
        <div className="mx-auto max-w-md">
          <Card className="border-white/10 bg-slate-950/70">
            <CardHeader>
              <CardTitle>Registration Restricted</CardTitle>
              <CardDescription>Only administrators can create new staff accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">Please contact an administrator to register a new account.</p>
              <Button asChild className="mt-6 w-full">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-clinic-gradient px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Button asChild variant="subtle" className="mb-6">
          <Link to={authUser ? '/dashboard' : '/login'}>
            <ArrowLeft className="h-4 w-4" />
            {authUser ? 'Back to Dashboard' : 'Back to Login'}
          </Link>
        </Button>

        <Card className="border-white/10 bg-slate-950/70 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create Account
            </CardTitle>
            <CardDescription>
              {authUser
                ? 'Create a new staff account (admin only).'
                : 'Register the first administrator account.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4" onSubmit={submitRegister}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="fullName">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="email">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@clinic.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Strong password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <p className="text-xs text-slate-400">
                  Minimum 12 characters required (use uppercase, lowercase, numbers, and symbols for best security).
                </p>
              </div>
              {authUser?.role === 'ADMIN' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-200" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as 'ADMIN' | 'DOCTOR' | 'RECEPTIONIST')}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-400 transition-colors hover:border-white/20 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              )}
              {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
              {successMessage ? <p className="text-sm text-green-300">{successMessage}</p> : null}
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
              {!authUser && (
                <p className="text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
