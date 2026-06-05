import type { InterfaceLanguage } from './ui-settings';

const dictionaries: Record<Exclude<InterfaceLanguage, 'en'>, Record<string, string>> = {
  ru: {
    Dashboard: 'Панель',
    Patients: 'Пациенты',
    Appointments: 'Записи',
    Records: 'Карты',
    Settings: 'Настройки',
    'Admin panel': 'Админ-панель',
    'Clinic management suite': 'Система управления клиникой',
    'Your access level': 'Ваш уровень доступа',
    'Sign out': 'Выйти',
    'You have admin permissions for platform and staff governance.': 'У вас права администратора для управления системой и сотрудниками.',
    'You have doctor permissions to search patients and review records.': 'У вас права врача для работы с пациентами и медицинскими картами.',
    'You have receptionist permissions to manage patients, appointments, and clinic operations.': 'У вас права регистратора для управления пациентами, записями и операциями клиники.',

    'Interface settings': 'Настройки интерфейса',
    'Language, theme, and scale are stored for the signed-in user and applied across the app.': 'Язык, тема и масштаб сохраняются для текущего пользователя и применяются ко всему сайту.',
    Language: 'Язык',
    Theme: 'Тема',
    dark: 'Тёмная',
    light: 'Светлая',
    'Interface scale': 'Масштаб интерфейса',
    'Current user': 'Текущий пользователь',
    'Save settings': 'Сохранить настройки',
    'Settings saved for this user.': 'Настройки сохранены для этого пользователя.',

    'Operations overview': 'Обзор операций',
    'Coordinate care from intake to follow-up.': 'Координация лечения от приёма до наблюдения.',
    'ClinicOS keeps scheduling, patients, and clinical workflows in one secure workspace for the whole clinic team.': 'ClinicOS объединяет расписание, пациентов и клинические процессы в одном рабочем пространстве для всей команды клиники.',
    'Active patients': 'Активные пациенты',
    'Open charts': 'Открытые карты',
    'Appointments today': 'Записи сегодня',
    'Completed visits': 'Завершённые визиты',
    'registered patients': 'зарегистрированные пациенты',
    'medical records': 'медицинские записи',
    upcoming: 'предстоящих',
    cancelled: 'отменено',
    "Today's focus": 'Фокус на сегодня',
    "Today's work at a glance.": 'Сегодняшняя работа одним взглядом.',
    'Patients checked in': 'Пациенты на приёме',
    'waiting for care': 'ожидают приёма',
    'visits currently in progress.': 'визитов сейчас в работе.',
    'Clinical notes': 'Клинические заметки',
    'records created today': 'записей создано сегодня',
    'New clinical notes added today.': 'Новые клинические заметки за сегодня.',
    'Open clinic board': 'Открыть доску клиники',
    'Upcoming appointments': 'Ближайшие записи',
    'Next scheduled visits.': 'Следующие запланированные визиты.',
    'No upcoming appointments found.': 'Ближайших записей нет.',
    'Поиск пациентов': 'Поиск пациентов',
    'Доступно только для ролей DOCTOR и RECEPTIONIST.': 'Доступно для ADMIN, DOCTOR и RECEPTIONIST.',
    Найти: 'Найти',
    Поиск: 'Поиск',
    Результаты: 'Результаты',
    'Анкета пациента': 'Анкета пациента'
  },
  ro: {
    Dashboard: 'Panou',
    Patients: 'Pacienti',
    Appointments: 'Programari',
    Records: 'Fise medicale',
    Settings: 'Setari',
    'Admin panel': 'Panou admin',
    'Clinic management suite': 'Sistem de management clinic',
    'Your access level': 'Nivelul tau de acces',
    'Sign out': 'Iesire',
    'You have admin permissions for platform and staff governance.': 'Ai permisiuni de administrator pentru sistem si personal.',
    'You have doctor permissions to search patients and review records.': 'Ai permisiuni de medic pentru pacienti si fise medicale.',
    'You have receptionist permissions to manage patients, appointments, and clinic operations.': 'Ai permisiuni de receptie pentru pacienti, programari si operatiuni.',

    'Interface settings': 'Setari interfata',
    'Language, theme, and scale are stored for the signed-in user and applied across the app.': 'Limba, tema si marimea se salveaza pentru utilizator si se aplica in toata aplicatia.',
    Language: 'Limba',
    Theme: 'Tema',
    dark: 'Intunecata',
    light: 'Luminoasa',
    'Interface scale': 'Scara interfetei',
    'Current user': 'Utilizator curent',
    'Save settings': 'Salveaza setarile',
    'Settings saved for this user.': 'Setarile au fost salvate.',

    'Operations overview': 'Privire operationala',
    'Coordinate care from intake to follow-up.': 'Coordoneaza ingrijirea de la primire pana la monitorizare.',
    'ClinicOS keeps scheduling, patients, and clinical workflows in one secure workspace for the whole clinic team.': 'ClinicOS uneste programarile, pacientii si fluxurile clinice intr-un singur spatiu de lucru pentru echipa clinicii.',
    'Active patients': 'Pacienti activi',
    'Open charts': 'Fise deschise',
    'Appointments today': 'Programari azi',
    'Completed visits': 'Vizite finalizate',
    'registered patients': 'pacienti inregistrati',
    'medical records': 'fise medicale',
    upcoming: 'viitoare',
    cancelled: 'anulate',
    "Today's focus": 'Focus azi',
    "Today's work at a glance.": 'Activitatea de azi dintr-o privire.',
    'Patients checked in': 'Pacienti sositi',
    'waiting for care': 'asteapta consultatia',
    'visits currently in progress.': 'vizite in desfasurare.',
    'Clinical notes': 'Note clinice',
    'records created today': 'fise create azi',
    'New clinical notes added today.': 'Note clinice noi adaugate azi.',
    'Open clinic board': 'Deschide panoul clinicii',
    'Upcoming appointments': 'Programari viitoare',
    'Next scheduled visits.': 'Urmatoarele vizite programate.',
    'No upcoming appointments found.': 'Nu exista programari viitoare.',
    'Поиск пациентов': 'Cautare pacienti',
    'Доступно только для ролей DOCTOR и RECEPTIONIST.': 'Disponibil pentru ADMIN, DOCTOR si RECEPTIONIST.',
    Найти: 'Cauta',
    Поиск: 'Cautare',
    Результаты: 'Rezultate',
    'Анкета пациента': 'Fisa pacientului'
  }
};

let observer: MutationObserver | null = null;
let currentLanguage: InterfaceLanguage = 'en';
const originalTextNodes = new WeakMap<Text, string>();

function translateValue(value: string, language: InterfaceLanguage) {
  if (language === 'en') return value;
  return dictionaries[language][value] ?? value;
}

function translateTextNode(node: Text, language: InterfaceLanguage) {
  const parent = node.parentElement;
  if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return;

  const original = originalTextNodes.get(node) ?? node.nodeValue ?? '';
  if (!originalTextNodes.has(node)) {
    originalTextNodes.set(node, original);
  }

  const trimmed = original.trim();
  if (!trimmed) return;

  const translated = translateValue(trimmed, language);
  node.nodeValue = original.replace(trimmed, translated);
}

function translateElementAttributes(element: Element, language: InterfaceLanguage) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
  const original = element.dataset.i18nOriginalPlaceholder ?? element.placeholder;
  if (!element.dataset.i18nOriginalPlaceholder) {
    element.dataset.i18nOriginalPlaceholder = original;
  }
  element.placeholder = translateValue(original, language);
}

function walk(root: ParentNode, language: InterfaceLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => translateTextNode(node, language));

  if (root instanceof Element) translateElementAttributes(root, language);
  root.querySelectorAll?.('input, textarea').forEach((element) => translateElementAttributes(element, language));
}

export function applyTranslations(language: InterfaceLanguage) {
  if (typeof document === 'undefined') return;
  currentLanguage = language;
  walk(document.body, language);

  if (!observer) {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Text) translateTextNode(node, currentLanguage);
          if (node instanceof Element) walk(node, currentLanguage);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
