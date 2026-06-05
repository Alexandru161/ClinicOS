import { useState } from 'react';
import { Languages, Moon, Sun, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthUser } from '@/lib/auth-session';
import {
  getUiSettings,
  saveUiSettings,
  type InterfaceLanguage,
  type InterfaceScale,
  type InterfaceTheme,
  type UiSettings
} from '@/lib/ui-settings';

const languageOptions: Array<{ value: InterfaceLanguage; label: string }> = [
  { value: 'ru', label: 'Russian' },
  { value: 'ro', label: 'Romanian' },
  { value: 'en', label: 'English' }
];

const scaleOptions: InterfaceScale[] = [90, 100, 110, 125];

export function SettingsPage() {
  const authUser = getAuthUser();
  const [settings, setSettings] = useState<UiSettings>(() => getUiSettings(authUser));
  const [message, setMessage] = useState<string | null>(null);

  const updateSettings = (next: UiSettings) => {
    setSettings(next);
    saveUiSettings(next, authUser);
    setMessage('Settings saved for this user.');
  };

  const save = () => {
    saveUiSettings(settings, authUser);
    setMessage('Settings saved for this user.');
  };

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle>Interface settings</CardTitle>
          <CardDescription>Language, theme, and scale are stored for the signed-in user and applied across the app.</CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" />
              Language
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {languageOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={settings.language === option.value ? 'default' : 'outline'}
                className="w-full justify-start"
                onClick={() => updateSettings({ ...settings, language: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.theme === 'dark' ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(['dark', 'light'] as InterfaceTheme[]).map((theme) => (
              <Button
                key={theme}
                type="button"
                variant={settings.theme === theme ? 'default' : 'outline'}
                className="w-full justify-start capitalize"
                onClick={() => updateSettings({ ...settings, theme })}
              >
                {theme}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-primary" />
              Interface scale
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {scaleOptions.map((scale) => (
              <Button
                key={scale}
                type="button"
                variant={settings.scale === scale ? 'default' : 'outline'}
                onClick={() => updateSettings({ ...settings, scale })}
              >
                {scale}%
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card className="border-white/10 bg-slate-950/70">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Current user</p>
            <p className="text-sm text-slate-300">{authUser?.fullName ?? 'Unknown'} | {authUser?.role ?? '-'}</p>
          </div>
          <div className="flex items-center gap-3">
            {message ? <p className="text-sm text-green-300">{message}</p> : null}
            <Button type="button" onClick={save}>Save settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
