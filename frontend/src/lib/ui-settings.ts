import type { AuthUser } from '@/api/auth';
import { applyTranslations } from './i18n';

export type InterfaceLanguage = 'ru' | 'ro' | 'en';
export type InterfaceTheme = 'dark' | 'light';
export type InterfaceScale = 90 | 100 | 110 | 125;

export interface UiSettings {
  language: InterfaceLanguage;
  theme: InterfaceTheme;
  scale: InterfaceScale;
}

const DEFAULT_SETTINGS: UiSettings = {
  language: 'ru',
  theme: 'dark',
  scale: 100
};

function storageKey(user?: AuthUser | null) {
  return `clinicos.uiSettings.${user?.id ?? 'anonymous'}`;
}

export function getUiSettings(user?: AuthUser | null): UiSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  const raw = window.localStorage.getItem(storageKey(user));
  if (!raw) return DEFAULT_SETTINGS;

  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UiSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveUiSettings(settings: UiSettings, user?: AuthUser | null) {
  window.localStorage.setItem(storageKey(user), JSON.stringify(settings));
  applyUiSettings(settings);
}

export function applyUiSettings(settings: UiSettings) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.lang = settings.language;
  document.documentElement.style.fontSize = `${settings.scale}%`;
  window.setTimeout(() => applyTranslations(settings.language), 0);
}
