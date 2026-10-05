import { getStoredLanguage, type Language } from '@shared/i18n';

const STRINGS = {
  ru: {
    title: 'Hellas Sennaar',
    username: 'Ник',
    password: 'Пароль',
    login: 'Войти',
    register: 'Создать аккаунт',
    guest: 'Играть гостем',
    loginFailed: 'Неверный ник или пароль',
    userExists: 'Такой ник уже занят',
    networkError: 'Нет связи с сервером',
    loading: 'Корабль входит в гавань…',
    retrying: 'Сервер просыпается, попытка {v}',
    retry: 'Повторить',
    offline: 'офлайн',
    today: 'Просьбы сегодня',
    streak: 'Серия',
    continueHint: 'Enter — дальше',
    correct: 'Верно!',
    wrong: 'Неверно',
    rightAnswer: 'Правильный ответ',
    practice: 'Практика',
    review: 'Повторение',
    fresh: 'Новое',
    src_historian: 'Историк',
    paused: 'Пауза',
    resume: 'Продолжить',
    language: 'Язык интерфейса: русский',
    logout: 'Выйти из аккаунта',
    controls: 'WASD — идти · E — говорить · Tab — дневник · C — камера · Esc — пауза',
    talk: 'E — говорить',
    nextHint: 'E — дальше · клик по слову — дневник',
    chooseHint: '1–3 — ответить',
    journal: 'Дневник',
    yourGuess: 'твоя догадка…',
    pageLocked: 'Страница откроется, когда встретишь все её слова.',
    check: 'Проверить',
    newWords: 'Новых слов в дневнике: {v}',
    itemGot: 'Получено: {v}',
    pageSolved: 'Страница расшифрована!',
    pageWrong: 'Не сходится…',
    examDone: 'Историк: на сегодня всё',
    chapterDone: 'Глава 1 пройдена',
    chapterNext: 'Глава 2 откроется, когда закрепишь 80% слов (сейчас {v}%). Возвращайся каждый день — жители Пирея будут просить повторить слова.',
    noWebgl: 'Нужен WebGL: обнови драйвер видеокарты или браузер.',
  },
  el: {
    title: 'Hellas Sennaar',
    username: 'Ψευδώνυμο',
    password: 'Κωδικός',
    login: 'Είσοδος',
    register: 'Νέος λογαριασμός',
    guest: 'Παίξε ως επισκέπτης',
    loginFailed: 'Λάθος ψευδώνυμο ή κωδικός',
    userExists: 'Το ψευδώνυμο υπάρχει ήδη',
    networkError: 'Δεν υπάρχει σύνδεση με τον διακομιστή',
    loading: 'Το πλοίο μπαίνει στο λιμάνι…',
    retrying: 'Ο διακομιστής ξυπνά, προσπάθεια {v}',
    retry: 'Ξανά',
    offline: 'εκτός σύνδεσης',
    today: 'Αιτήματα σήμερα',
    streak: 'Σερί',
    continueHint: 'Enter — συνέχεια',
    correct: 'Σωστά!',
    wrong: 'Λάθος',
    rightAnswer: 'Σωστή απάντηση',
    practice: 'Εξάσκηση',
    review: 'Επανάληψη',
    fresh: 'Νέο',
    src_historian: 'Ιστορικός',
    paused: 'Παύση',
    resume: 'Συνέχεια',
    language: 'Γλώσσα: ελληνικά',
    logout: 'Αποσύνδεση',
    controls: 'WASD — κίνηση · E — μίλα · Tab — ημερολόγιο · C — κάμερα · Esc — παύση',
    talk: 'E — μίλα',
    nextHint: 'E — συνέχεια · κλικ σε λέξη — ημερολόγιο',
    chooseHint: '1–3 — απάντηση',
    journal: 'Ημερολόγιο',
    yourGuess: 'η εικασία σου…',
    pageLocked: 'Η σελίδα ανοίγει όταν δεις όλες τις λέξεις της.',
    check: 'Έλεγχος',
    newWords: 'Νέες λέξεις στο ημερολόγιο: {v}',
    itemGot: 'Πήρες: {v}',
    pageSolved: 'Η σελίδα αποκρυπτογραφήθηκε!',
    pageWrong: 'Δεν ταιριάζει…',
    examDone: 'Ο ιστορικός: αρκετά για σήμερα',
    chapterDone: 'Το κεφάλαιο 1 ολοκληρώθηκε',
    chapterNext: 'Το κεφάλαιο 2 ανοίγει όταν σταθεροποιήσεις το 80% των λέξεων (τώρα {v}%). Έλα κάθε μέρα.',
    noWebgl: 'Χρειάζεται WebGL: ενημέρωσε τον οδηγό κάρτας γραφικών ή τον browser.',
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
