import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'ru' | 'el';

type Translations = {
  [key: string]: {
    ru: string;
    el: string;
  };
};

const translations: Translations = {
  // Header
  'app.title': { ru: 'Путь к гражданству', el: 'Δρόμος προς την ιθαγένεια' },
  'nav.learn': { ru: 'Учиться', el: 'Μάθηση' },
  'nav.profile': { ru: 'Профиль', el: 'Προφίλ' },
  'nav.admin': { ru: 'Админ-панель', el: 'Διαχείριση' },
  'nav.logout': { ru: 'Выйти', el: 'Αποσύνδεση' },
  'nav.login': { ru: 'Войти', el: 'Σύνδεση' },
  'nav.register': { ru: 'Регистрация', el: 'Εγγραφή' },
  
  // Topics
  'topic.history': { ru: 'История Греции', el: 'Ιστορία της Ελλάδας' },
  'topic.history.desc': { ru: 'Древняя Эллада, Византия, современная история', el: 'Αρχαία Ελλάδα, Βυζάντιο, σύγχρονη ιστορία' },
  'topic.culture': { ru: 'Культура и традиции', el: 'Πολιτισμός και παραδόσεις' },
  'topic.culture.desc': { ru: 'Праздники, обычаи, символы Греции', el: 'Γιορτές, έθιμα, σύμβολα της Ελλάδας' },
  'topic.laws': { ru: 'Законы и политика', el: 'Νόμοι και πολιτική' },
  'topic.laws.desc': { ru: 'Конституция, права граждан, госустройство', el: 'Σύνταγμα, δικαιώματα πολιτών, κρατική δομή' },
  'topic.geography': { ru: 'География Греции', el: 'Γεωγραφία της Ελλάδας' },
  'topic.geography.desc': { ru: 'Регионы, города, острова, природа', el: 'Περιφέρειες, πόλεις, νησιά, φύση' },
  
  // Modes
  'mode.flashcards': { ru: 'Карточки', el: 'Κάρτες' },
  'mode.flashcards.desc': { ru: 'Переворачивайте карточки для изучения', el: 'Γυρίστε τις κάρτες για μελέτη' },
  'mode.quiz': { ru: 'Тест', el: 'Κουίζ' },
  'mode.quiz.desc': { ru: 'Выберите правильный ответ из 4 вариантов', el: 'Επιλέξτε τη σωστή απάντηση από 4 επιλογές' },
  'mode.input': { ru: 'Ввод', el: 'Πληκτρ.' },
  'mode.input.desc': { ru: 'Напишите ответ самостоятельно', el: 'Γράψτε την απάντηση μόνοι σας' },
  'mode.exam': { ru: 'Экзамен', el: 'Εξέταση' },
  'mode.exam.desc': { ru: 'Симуляция теста с таймером', el: 'Προσομοίωση τεστ με χρονόμετρο' },
  
  // Learn page
  'learn.selectTopic': { ru: 'Выберите тему', el: 'Επιλέξτε θέμα' },
  'learn.selectTopic.desc': { ru: 'Начните изучение с интересующей вас темы', el: 'Ξεκινήστε τη μελέτη με ένα θέμα που σας ενδιαφέρει' },
  'learn.takeExam': { ru: 'Или пройдите экзамен', el: 'Ή δώστε εξέταση' },
  'learn.examSimulation': { ru: 'Симуляция экзамена', el: 'Προσομοίωση εξέτασης' },
  'learn.examSimulation.desc': { ru: 'Проверьте свои знания в условиях, приближённых к реальному тесту', el: 'Ελέγξτε τις γνώσεις σας σε συνθήκες παρόμοιες με το πραγματικό τεστ' },
  'learn.startExam': { ru: 'Начать экзамен', el: 'Έναρξη εξέτασης' },
  
  // Quiz
  'quiz.backToTopics': { ru: 'Назад к темам', el: 'Πίσω στα θέματα' },
  'quiz.noQuestions': { ru: 'Вопросов пока нет', el: 'Δεν υπάρχουν ερωτήσεις ακόμα' },
  'quiz.noQuestions.desc': { ru: 'В этой теме пока нет вопросов.', el: 'Δεν υπάρχουν ερωτήσεις σε αυτό το θέμα ακόμα.' },
  'quiz.explanation': { ru: 'Объяснение:', el: 'Εξήγηση:' },
  'quiz.nextQuestion': { ru: 'Следующий вопрос', el: 'Επόμενη ερώτηση' },
  'quiz.finishTest': { ru: 'Завершить тест', el: 'Ολοκλήρωση τεστ' },
  'quiz.correctAnswers': { ru: 'Правильных ответов:', el: 'Σωστές απαντήσεις:' },
  'quiz.finished': { ru: 'Тест завершён!', el: 'Το τεστ ολοκληρώθηκε!' },
  'quiz.result.great': { ru: 'Отличный результат!', el: 'Εξαιρετικό αποτέλεσμα!' },
  'quiz.result.good': { ru: 'Хороший результат, но есть куда расти!', el: 'Καλό αποτέλεσμα, αλλά υπάρχει περιθώριο βελτίωσης!' },
  'quiz.result.practice': { ru: 'Нужно больше практики!', el: 'Χρειάζεται περισσότερη εξάσκηση!' },
  'quiz.tryAgain': { ru: 'Пройти снова', el: 'Δοκιμάστε ξανά' },
  'quiz.toTopics': { ru: 'К темам', el: 'Στα θέματα' },
  'quiz.of': { ru: 'из', el: 'από' },
  
  // Flashcards
  'flashcards.question': { ru: 'Вопрос', el: 'Ερώτηση' },
  'flashcards.answer': { ru: 'Ответ', el: 'Απάντηση' },
  'flashcards.clickToFlip': { ru: 'Нажмите, чтобы перевернуть', el: 'Κάντε κλικ για αναστροφή' },
  'flashcards.know': { ru: 'Знаю', el: 'Ξέρω' },
  'flashcards.dontKnow': { ru: 'Не знаю', el: 'Δεν ξέρω' },
  'flashcards.next': { ru: 'Далее', el: 'Επόμενο' },
  'flashcards.prev': { ru: 'Назад', el: 'Προηγούμενο' },
  'flashcards.shuffle': { ru: 'Перемешать', el: 'Ανακάτεμα' },
  'flashcards.finished': { ru: 'Карточки закончились!', el: 'Οι κάρτες τελείωσαν!' },
  'flashcards.known': { ru: 'Знаю', el: 'Ξέρω' },
  'flashcards.unknown': { ru: 'Не знаю', el: 'Δεν ξέρω' },
  
  // Input mode
  'input.placeholder': { ru: 'Введите ваш ответ...', el: 'Πληκτρολογήστε την απάντησή σας...' },
  'input.correct': { ru: 'Правильно!', el: 'Σωστά!' },
  'input.incorrect': { ru: 'Неправильно', el: 'Λάθος' },
  'input.correctAnswer': { ru: 'Правильный ответ:', el: 'Σωστή απάντηση:' },
  
  // Index page
  'index.hero.title': { ru: 'Подготовка к тесту на греческое гражданство', el: 'Προετοιμασία για το τεστ ελληνικής ιθαγένειας' },
  'index.hero.subtitle': { ru: 'Интерактивная платформа для изучения истории, культуры и законов Греции', el: 'Διαδραστική πλατφόρμα για τη μελέτη της ιστορίας, του πολιτισμού και των νόμων της Ελλάδας' },
  'index.startLearning': { ru: 'Начать обучение', el: 'Έναρξη μάθησης' },
  'index.selectTopic': { ru: 'Выберите тему для изучения', el: 'Επιλέξτε θέμα για μελέτη' },
  
  // Auth
  'auth.email': { ru: 'Email', el: 'Email' },
  'auth.password': { ru: 'Пароль', el: 'Κωδικός' },
  'auth.name': { ru: 'Имя', el: 'Όνομα' },
  'auth.loginTitle': { ru: 'Вход в аккаунт', el: 'Σύνδεση στο λογαριασμό' },
  'auth.registerTitle': { ru: 'Создание аккаунта', el: 'Δημιουργία λογαριασμού' },
  'auth.noAccount': { ru: 'Нет аккаунта?', el: 'Δεν έχετε λογαριασμό;' },
  'auth.hasAccount': { ru: 'Уже есть аккаунт?', el: 'Έχετε ήδη λογαριασμό;' },
  
  // Common
  'common.loading': { ru: 'Загрузка...', el: 'Φόρτωση...' },
  'common.error': { ru: 'Ошибка', el: 'Σφάλμα' },
  'common.save': { ru: 'Сохранить', el: 'Αποθήκευση' },
  'common.cancel': { ru: 'Отмена', el: 'Ακύρωση' },
  'common.delete': { ru: 'Удалить', el: 'Διαγραφή' },
  'common.edit': { ru: 'Редактировать', el: 'Επεξεργασία' },
  'common.add': { ru: 'Добавить', el: 'Προσθήκη' },
  
  // Exam extended
  'exam.settings': { ru: 'Настройки экзамена', el: 'Ρυθμίσεις εξέτασης' },
  'exam.questionCount': { ru: 'Количество вопросов', el: 'Αριθμός ερωτήσεων' },
  'exam.timeLimit': { ru: 'Время (минут)', el: 'Χρόνος (λεπτά)' },
  'exam.selectTopics': { ru: 'Темы', el: 'Θέματα' },
  'exam.flagQuestion': { ru: 'Отметить вопрос', el: 'Επισήμανση ερώτησης' },
  'exam.flagged': { ru: 'Отмечено', el: 'Επισημάνθηκε' },
  'exam.unansweredWarning': { ru: 'Есть неотвеченные вопросы', el: 'Υπάρχουν αναπάντητες ερωτήσεις' },
  'exam.topicsBreakdown': { ru: 'Статистика по темам', el: 'Στατιστικά ανά θέμα' },
  'exam.weakAreas': { ru: 'Слабые места', el: 'Αδύνατα σημεία' },
  'exam.avgTimePerQuestion': { ru: 'Среднее время на вопрос', el: 'Μέσος χρόνος ανά ερώτηση' },
  'exam.practiceErrors': { ru: 'Повторить ошибки', el: 'Επανάληψη λαθών' },
  'exam.exportResults': { ru: 'Экспорт результатов', el: 'Εξαγωγή αποτελεσμάτων' },
  'exam.viewHistory': { ru: 'История экзаменов', el: 'Ιστορικό εξετάσεων' },
  'exam.noLimit': { ru: 'Без ограничения', el: 'Χωρίς όριο' },
  'exam.allQuestions': { ru: 'Все вопросы', el: 'Όλες οι ερωτήσεις' },
  'exam.passed': { ru: 'Сдан', el: 'Επιτυχία' },
  'exam.failed': { ru: 'Не сдан', el: 'Αποτυχία' },
  
  // Profile extended
  'profile.examHistory': { ru: 'История экзаменов', el: 'Ιστορικό εξετάσεων' },
  'profile.progressChart': { ru: 'График прогресса', el: 'Διάγραμμα προόδου' },
  'profile.averageScore': { ru: 'Средний балл', el: 'Μέση βαθμολογία' },
  'profile.viewDetails': { ru: 'Подробнее', el: 'Λεπτομέρειες' },
  'profile.noExams': { ru: 'Нет завершённых экзаменов', el: 'Δεν υπάρχουν ολοκληρωμένες εξετάσεις' },
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ru';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
