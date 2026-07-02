import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Language = 'ru' | 'el';

type Translations = Record<string, { ru: string; el: string }>;

const translations: Translations = {
  // ---- Nav ----
  'nav.home': { ru: 'Главная', el: 'Αρχική' },
  'nav.quiz': { ru: 'Тест', el: 'Κουίζ' },
  'nav.flashcards': { ru: 'Карточки', el: 'Κάρτες' },
  'nav.vocab': { ru: 'Словарь', el: 'Λεξιλόγιο' },
  'nav.stats': { ru: 'Прогресс', el: 'Πρόοδος' },
  'nav.aria': { ru: 'Главная навигация', el: 'Κύρια πλοήγηση' },
  'nav.close': { ru: 'Закрыть', el: 'Κλείσιμο' },
  'nav.menu': { ru: 'Меню', el: 'Μενού' },

  // ---- Common ----
  'common.error': { ru: 'Ошибка соединения.', el: 'Σφάλμα σύνδεσης.' },
  'common.pronounce': { ru: 'Произношение', el: 'Προφορά' },
  'common.retry': { ru: 'Ещё раз', el: 'Ξανά' },
  'common.correct': { ru: 'верно', el: 'σωστά' },
  'common.wrong': { ru: 'неверно', el: 'λάθος' },

  // ---- Home ----
  'home.welcome': { ru: 'С возвращением,', el: 'Καλώς ήρθες πίσω,' },
  'home.streakDay': { ru: 'день', el: 'μέρα' },
  'home.streakDays': { ru: 'дней', el: 'μέρες' },
  'home.section.learn': { ru: 'Обучение', el: 'Μάθηση' },
  'home.quiz.desc': { ru: '10 вопросов по теме', el: '10 ερωτήσεις ανά θέμα' },
  'home.flashcards.desc': { ru: 'Повторение по SRS', el: 'Επανάληψη με SRS' },
  'home.vocab.desc': { ru: '150 слов', el: '150 λέξεις' },
  'home.stats.title': { ru: 'Статистика', el: 'Στατιστικά' },
  'home.stats.desc': { ru: 'Твой прогресс и история', el: 'Η πρόοδός σου & ιστορικό' },

  // ---- Topics (quiz topic selector + labels) ----
  'topic.mixed': { ru: 'Все темы', el: 'Όλα τα θέματα' },
  'topic.mixed.desc': { ru: '10 случайных вопросов', el: '10 τυχαίες ερωτήσεις' },
  'topic.history': { ru: 'История', el: 'Ιστορία' },
  'topic.culture': { ru: 'Культура', el: 'Πολιτισμός' },
  'topic.laws': { ru: 'Законы', el: 'Νομοθεσία' },
  'topic.geography': { ru: 'География', el: 'Γεωγραφία' },

  // ---- Quiz ----
  'quiz.chooseTopic': { ru: 'Выбери тему', el: 'Διάλεξε θέμα' },
  'quiz.next': { ru: 'Далее', el: 'Επόμενη' },
  'quiz.result': { ru: 'Результат', el: 'Αποτέλεσμα' },
  'quiz.result.great': { ru: 'Отлично!', el: 'Εξαιρετικά!' },
  'quiz.result.good': { ru: 'Молодец!', el: 'Μπράβο!' },
  'quiz.result.keepGoing': { ru: 'Продолжай!', el: 'Συνέχισε!' },
  'quiz.result.tryHarder': { ru: 'Можешь лучше', el: 'Μπορείς καλύτερα' },
  'quiz.otherTopic': { ru: 'Другая тема', el: 'Άλλο θέμα' },

  // ---- Flashcards ----
  'flashcards.empty': {
    ru: 'Сейчас нет карточек для повторения. Загляни позже!',
    el: 'Δεν υπάρχουν κάρτες για επανάληψη τώρα. Έλα αργότερα!',
  },
  'flashcards.done': { ru: 'Сессия завершена!', el: 'Η συνεδρία ολοκληρώθηκε!' },
  'flashcards.cardsCount': { ru: 'карточек', el: 'κάρτες' },
  'flashcards.showAnswer': { ru: 'Показать ответ', el: 'Δείξε απάντηση' },

  // ---- Vocab ----
  'vocab.empty': {
    ru: 'На сегодня слов нет. Приходи завтра за новыми!',
    el: 'Δεν υπάρχουν λέξεις για σήμερα. Έλα αύριο για νέες!',
  },
  'vocab.done': { ru: 'Готово!', el: 'Ολοκληρώθηκε!' },
  'vocab.wordsCount': { ru: 'слов', el: 'λέξεις' },
  'vocab.tapToReveal': { ru: 'Нажми, чтобы увидеть перевод', el: 'Πάτησε για μετάφραση' },

  // ---- Grade buttons (flashcards + vocab) ----
  'grade.hard': { ru: 'Сложно', el: 'Δύσκολο' },
  'grade.good': { ru: 'Хорошо', el: 'Καλά' },
  'grade.easy': { ru: 'Знаю', el: 'Το ξέρω' },
  'grade.hard.sub': { ru: '10 минут', el: '10 λεπτά' },
  'grade.good.sub': { ru: '1 день', el: '1 ημέρα' },
  'grade.easy.sub': { ru: '4 дня', el: '4 ημέρες' },

  // ---- Stats ----
  'stats.summary': { ru: 'Сводка', el: 'Σύνοψη' },
  'stats.accuracy': { ru: 'успех', el: 'επιτυχία' },
  'stats.quiz': { ru: 'Тесты', el: 'Κουίζ' },
  'stats.streak': { ru: 'Серия', el: 'Σερί' },
  'stats.byTopic': { ru: 'По темам', el: 'Ανά θέμα' },
  'stats.vocabSection': { ru: 'Словарь', el: 'Λεξιλόγιο' },
  'stats.masteredWords': { ru: 'Освоенные слова', el: 'Κατακτημένες λέξεις' },
  'stats.reviewed': { ru: 'Повторено', el: 'Επαναλήφθηκαν' },
  'stats.history': { ru: 'История', el: 'Ιστορικό' },
  'stats.empty': {
    ru: 'Ты еще не проходил тесты. Начни сейчас!',
    el: 'Δεν έχεις κάνει ακόμα κουίζ. Ξεκίνα τώρα!',
  },
  'stats.error': { ru: 'Ошибка соединения. Попробуй еще раз.', el: 'Σφάλμα σύνδεσης. Δοκίμασε ξανά.' },

  // ---- Streak celebration ----
  'streak.title': { ru: 'дней подряд!', el: 'ημέρες σερί!' },
  'streak.sub': {
    ru: 'Продолжай в том же духе, твой прогресс впечатляет.',
    el: 'Συνέχισε έτσι, η πρόοδός σου είναι εκπληκτική.',
  },
  'streak.continue': { ru: 'Продолжить', el: 'Συνέχεια' },

  // ---- Landing ----
  'landing.enter': { ru: 'Войти', el: 'Είσοδος' },
  'landing.pill': { ru: 'Учи греческий', el: 'Μάθε ελληνικά' },
  'landing.pill.b': { ru: 'умно', el: 'έξυπνα' },
  'landing.h1.line1': { ru: 'Греческий язык,', el: 'Τα ελληνικά,' },
  'landing.h1.highlight': { ru: 'как никогда раньше.', el: 'όπως ποτέ πριν.' },
  'landing.sub': {
    ru: 'Тесты, карточки с умным повторением и словарь с произношением — всё в одном чистом, быстром приложении. Строй свою серию и следи за прогрессом каждый день.',
    el: 'Κουίζ, κάρτες με έξυπνη επανάληψη και λεξιλόγιο με προφορά — όλα σε μία καθαρή, γρήγορη εφαρμογή. Χτίσε το σερί σου και δες την πρόοδό σου κάθε μέρα.',
  },
  'landing.cta.start': { ru: 'Начать сейчас', el: 'Ξεκίνα τώρα' },
  'landing.cta.see': { ru: 'Посмотреть приложение', el: 'Δες την εφαρμογή' },
  'landing.steps.title': { ru: 'Как это работает', el: 'Πώς λειτουργεί' },
  'landing.step1.title': { ru: 'Выбери способ', el: 'Διάλεξε τρόπο' },
  'landing.step1.text': {
    ru: 'Тесты, карточки или словарь — начни с чего хочешь, без регистрации.',
    el: 'Κουίζ, κάρτες ή λεξιλόγιο — ξεκίνα από όπου θέλεις, χωρίς εγγραφή.',
  },
  'landing.step2.title': { ru: 'Занимайся каждый день', el: 'Εξασκήσου καθημερινά' },
  'landing.step2.text': {
    ru: 'Система SRS показывает каждый вопрос точно в нужный момент, чтобы он запомнился.',
    el: 'Το σύστημα SRS φέρνει κάθε ερώτηση τη σωστή στιγμή για να μείνει στη μνήμη.',
  },
  'landing.step3.title': { ru: 'Смотри прогресс', el: 'Δες την πρόοδο' },
  'landing.step3.text': {
    ru: 'Серия, ежедневная цель и статистика по темам держат тебя в тонусе.',
    el: 'Σερί, καθημερινός στόχος και στατιστικά ανά θέμα σε κρατούν συνεπή.',
  },
  'landing.feature.quiz.title': { ru: 'Тесты', el: 'Κουίζ' },
  'landing.feature.quiz.text': {
    ru: 'Вопросы с выбором ответа по истории, культуре, законам и географии.',
    el: 'Ερωτήσεις πολλαπλής επιλογής σε ιστορία, πολιτισμό, νομοθεσία και γεωγραφία.',
  },
  'landing.feature.flashcards.title': { ru: 'Умные карточки', el: 'Έξυπνες κάρτες' },
  'landing.feature.flashcards.text': {
    ru: 'Система повторения (SRS), которая показывает каждую карточку точно в нужный момент.',
    el: 'Σύστημα επανάληψης (SRS) που φέρνει κάθε κάρτα ακριβώς τη σωστή στιγμή.',
  },
  'landing.feature.vocab.title': { ru: 'Словарь', el: 'Λεξιλόγιο' },
  'landing.feature.vocab.text': {
    ru: '150 базовых слов с переводом, заметками и произношением.',
    el: '150 βασικές λέξεις με μετάφραση, σημειώσεις και προφορά.',
  },
  'landing.feature.speech.title': { ru: 'Произношение', el: 'Προφορά' },
  'landing.feature.speech.text': {
    ru: 'Слушай каждое греческое слово с естественным произношением от Google TTS.',
    el: 'Άκου κάθε ελληνική λέξη με φυσική εκφώνηση από Google TTS.',
  },
  'landing.feature.streak.title': { ru: 'Серия и цель', el: 'Σερί & στόχος' },
  'landing.feature.streak.text': {
    ru: 'Ежедневная цель и серия дней, которые держат тебя в ритме.',
    el: 'Καθημερινός στόχος και σερί που σε κρατούν συνεπή.',
  },
  'landing.feature.progress.title': { ru: 'Прогресс', el: 'Πρόοδος' },
  'landing.feature.progress.text': {
    ru: 'Статистика по темам, история и процент успеха.',
    el: 'Στατιστικά ανά θέμα, ιστορικό και ποσοστό επιτυχίας.',
  },
  'landing.stat.words': { ru: 'слов', el: 'λέξεις' },
  'landing.stat.topics': { ru: 'темы теста', el: 'θέματα κουίζ' },
  'landing.stat.srs': { ru: 'умное повторение', el: 'έξυπνη επανάληψη' },
  'landing.foot.title': { ru: 'Готов начать?', el: 'Έτοιμος να ξεκινήσεις;' },
  'landing.foot.cta': { ru: 'Начни бесплатно', el: 'Ξεκίνα δωρεάν' },
};

export function t(key: string, lang: Language): string {
  const entry = translations[key];
  if (!entry) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  return entry[lang] ?? entry.el ?? key;
}

const LANG_KEY = 'hs_lang';

/** Plain (non-React) accessor — used by api.ts to tag requests with the current language. */
export function getStoredLanguage(): Language {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === 'ru' || saved === 'el' ? saved : 'el';
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: (key) => t(key, language) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
