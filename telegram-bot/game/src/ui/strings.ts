import { getStoredLanguage, type Language } from '@shared/i18n';

const STRINGS = {
  ru: {
    title: 'Hellas Quest',
    username: 'Ник',
    password: 'Пароль',
    login: 'Войти',
    register: 'Создать аккаунт',
    guest: 'Играть гостем',
    loginFailed: 'Неверный ник или пароль',
    userExists: 'Такой ник уже занят',
    networkError: 'Нет связи с сервером',
    loading: 'Корабль отплывает…',
    retrying: 'Сервер просыпается, попытка {v}',
    retry: 'Повторить',
    offline: 'офлайн',
    today: 'Сегодня',
    streak: 'Серия',
    continueHint: 'Enter — дальше',
    correct: 'Верно!',
    wrong: 'Неверно',
    rightAnswer: 'Правильный ответ',
    practice: 'Практика',
    review: 'Повторение',
    fresh: 'Новое',
    src_altar: 'Алтарь',
    src_shield: 'Щит',
    src_amphora: 'Амфора',
    src_boss: 'Сфинкс',
    paused: 'Пауза',
    resume: 'Продолжить',
    language: 'Язык: русский',
    logout: 'Выйти из аккаунта',
    controls: 'A/D — ходьба · Space — прыжок · J — удар · K — рывок · E — действие · 1–4 — ответ · Esc — пауза',
    victory: 'Сфинкс повержен!',
    victoryText: 'Акрополь пройден. Возвращайся завтра — очередь повторений обновится.',
    abilityDash: 'Новая способность: рывок (K)',
    abilityDoubleJump: 'Новая способность: двойной прыжок',
    altarProgress: 'Алтарь: {v}/3',
    heartUp: '+1 сердце',
    wallBroken: 'Стена рухнула',
    shieldDown: 'Щит сбит!',
    died: 'Ты пал… Возвращение к чекпоинту',
    dash: 'Рывок',
    doubleJump: 'Двойной прыжок',
  },
  el: {
    title: 'Hellas Quest',
    username: 'Ψευδώνυμο',
    password: 'Κωδικός',
    login: 'Είσοδος',
    register: 'Νέος λογαριασμός',
    guest: 'Παίξε ως επισκέπτης',
    loginFailed: 'Λάθος ψευδώνυμο ή κωδικός',
    userExists: 'Το ψευδώνυμο υπάρχει ήδη',
    networkError: 'Δεν υπάρχει σύνδεση με τον διακομιστή',
    loading: 'Το πλοίο σαλπάρει…',
    retrying: 'Ο διακομιστής ξυπνά, προσπάθεια {v}',
    retry: 'Ξανά',
    offline: 'εκτός σύνδεσης',
    today: 'Σήμερα',
    streak: 'Σερί',
    continueHint: 'Enter — συνέχεια',
    correct: 'Σωστά!',
    wrong: 'Λάθος',
    rightAnswer: 'Σωστή απάντηση',
    practice: 'Εξάσκηση',
    review: 'Επανάληψη',
    fresh: 'Νέο',
    src_altar: 'Βωμός',
    src_shield: 'Ασπίδα',
    src_amphora: 'Αμφορέας',
    src_boss: 'Σφίγγα',
    paused: 'Παύση',
    resume: 'Συνέχεια',
    language: 'Γλώσσα: ελληνικά',
    logout: 'Αποσύνδεση',
    controls: 'A/D — κίνηση · Space — άλμα · J — χτύπημα · K — ορμή · E — ενέργεια · 1–4 — απάντηση · Esc — παύση',
    victory: 'Η Σφίγγα νικήθηκε!',
    victoryText: 'Η Ακρόπολη είναι δική σου. Έλα αύριο — οι επαναλήψεις ανανεώνονται.',
    abilityDash: 'Νέα ικανότητα: ορμή (K)',
    abilityDoubleJump: 'Νέα ικανότητα: διπλό άλμα',
    altarProgress: 'Βωμός: {v}/3',
    heartUp: '+1 καρδιά',
    wallBroken: 'Ο τοίχος γκρεμίστηκε',
    shieldDown: 'Η ασπίδα έπεσε!',
    died: 'Έπεσες… Επιστροφή στο σημείο ελέγχου',
    dash: 'Ορμή',
    doubleJump: 'Διπλό άλμα',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['ru'];

export function s(key: StringKey, value?: string): string {
  const text: string = STRINGS[getStoredLanguage()][key];
  return value === undefined ? text : text.replace('{v}', value);
}

/** Same key the web app uses, so the API also returns cards in this language. */
export function setLanguage(lang: Language): void {
  try {
    localStorage.setItem('hs_lang', lang);
  } catch {
    /* ignore */
  }
}
