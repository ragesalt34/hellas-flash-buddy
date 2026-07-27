import { createContext, useContext, useState, type ReactNode } from 'react';

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
  'flashcards.answerLabel': { ru: 'Ответ', el: 'Απάντηση' },

  // ---- Vocab ----
  'vocab.empty': {
    ru: 'На сегодня слов нет. Приходи завтра за новыми!',
    el: 'Δεν υπάρχουν λέξεις για σήμερα. Έλα αύριο για νέες!',
  },
  'vocab.done': { ru: 'Готово!', el: 'Ολοκληρώθηκε!' },
  'vocab.wordsCount': { ru: 'слов', el: 'λέξεις' },
  'vocab.tapToReveal': { ru: 'Нажми, чтобы увидеть перевод', el: 'Πάτησε για μετάφραση' },

  // ---- Grade buttons (flashcards + vocab) ----
  // Grade sub-labels (the "come back in …" interval) are computed per card
  // level in src/srs.ts — static texts here would lie for most levels.
  'grade.hard': { ru: 'Сложно', el: 'Δύσκολο' },
  'grade.good': { ru: 'Хорошо', el: 'Καλά' },
  'grade.easy': { ru: 'Знаю', el: 'Το ξέρω' },

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

  // ---- Auth (nickname + password) ----
  'auth.title': { ru: 'Аккаунт', el: 'Λογαριασμός' },
  'auth.sub': {
    ru: 'Сохраняй прогресс и открывай его с любого устройства.',
    el: 'Κράτα την πρόοδό σου και άνοιξέ την από οποιαδήποτε συσκευή.',
  },
  'auth.login': { ru: 'Вход', el: 'Σύνδεση' },
  'auth.register': { ru: 'Регистрация', el: 'Εγγραφή' },
  'auth.username': { ru: 'Ник', el: 'Ψευδώνυμο' },
  'auth.usernameHint': { ru: 'Латиница, цифры и _ (3–20 символов)', el: 'Λατινικά, αριθμοί και _ (3–20 χαρακτήρες)' },
  'auth.password': { ru: 'Пароль', el: 'Κωδικός' },
  'auth.passwordHint': { ru: 'Минимум 6 символов', el: 'Τουλάχιστον 6 χαρακτήρες' },
  'auth.submit.login': { ru: 'Войти', el: 'Σύνδεση' },
  'auth.submit.register': { ru: 'Создать аккаунт', el: 'Δημιουργία λογαριασμού' },
  'auth.guest': { ru: 'Продолжить без аккаунта', el: 'Συνέχεια χωρίς λογαριασμό' },
  'auth.logout': { ru: 'Выйти', el: 'Έξοδος' },
  'auth.back': { ru: 'Назад', el: 'Πίσω' },
  'auth.loginChip': { ru: 'Войти', el: 'Σύνδεση' },
  'auth.error.taken': { ru: 'Этот ник уже занят', el: 'Αυτό το ψευδώνυμο χρησιμοποιείται ήδη' },
  'auth.error.invalid': { ru: 'Неверный ник или пароль', el: 'Λάθος ψευδώνυμο ή κωδικός' },
  'auth.error.input': { ru: 'Проверь ник и пароль', el: 'Έλεγξε το ψευδώνυμο και τον κωδικό' },

  // ---- Landing ----
  'landing.enter': { ru: 'Войти', el: 'Είσοδος' },
  'landing.pill': { ru: 'К греческому паспорту —', el: 'Προς το ελληνικό διαβατήριο —' },
  'landing.pill.b': { ru: '10 минут в день', el: '10 λεπτά τη μέρα' },
  'landing.footer.tag': { ru: 'Греческое гражданство', el: 'Ελληνική ιθαγένεια' },
  'landing.h1.line1': { ru: 'Твой путь к', el: 'Ο δρόμος σου' },
  'landing.h1.highlight': { ru: 'греческому гражданству.', el: 'προς την ιθαγένεια.' },
  'landing.sub': {
    ru: 'Настоящие вопросы с собеседования — история, культура, законы и география Греции. Тесты, карточки с умным повторением и 150 нужных слов с произношением. Бесплатно, без регистрации.',
    el: 'Πραγματικές ερωτήσεις της συνέντευξης — ιστορία, πολιτισμός, νομοθεσία και γεωγραφία. Κουίζ, έξυπνες κάρτες και 150 βασικές λέξεις με προφορά. Δωρεάν, χωρίς εγγραφή.',
  },
  'landing.cta.start': { ru: 'Начать сейчас', el: 'Ξεκίνα τώρα' },
  'landing.cta.see': { ru: 'Посмотреть приложение', el: 'Δες την εφαρμογή' },
  'landing.demo.label': {
    ru: 'Попробуй прямо сейчас — нажми на карточку',
    el: 'Δοκίμασέ το τώρα — πάτησε την κάρτα',
  },
  'landing.steps.title': { ru: 'Как это работает', el: 'Πώς λειτουργεί' },
  'landing.features.title': { ru: 'Что внутри', el: 'Τι περιλαμβάνει' },
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
  'landing.stat.questions': { ru: 'вопросов собеседования', el: 'ερωτήσεις συνέντευξης' },
  'landing.stat.words': { ru: 'слов с озвучкой', el: 'λέξεις με προφορά' },
  'landing.stat.topics': { ru: 'темы собеседования', el: 'θέματα συνέντευξης' },
  'landing.stat.srs': { ru: 'умное повторение', el: 'έξυπνη επανάληψη' },
  'landing.foot.title': {
    ru: 'Собеседование ближе, чем кажется.',
    el: "Η συνέντευξη είναι πιο κοντά απ' όσο νομίζεις.",
  },
  'landing.foot.cta': { ru: 'Начни бесплатно', el: 'Ξεκίνα δωρεάν' },

  // Opinion pull-quote — attitude, not a feature line
  'landing.quote': {
    ru: 'Собеседование проходят\nне зубрёжкой, а привычкой.',
    el: 'Τη συνέντευξη δεν την περνάς\nμε παπαγαλία, την περνάς με συνήθεια.',
  },
  'landing.quote.sub': {
    ru: '10 минут в день бьют ночь перед собеседованием.',
    el: '10 λεπτά την ημέρα νικούν το ξενύχτι πριν τη συνέντευξη.',
  },

  // FAQ. Answers explain HOW to prepare and why the app works the way it does —
  // the previous four were all about the business model ("free?", "signup?") and
  // taught the reader nothing. Deliberately silent on the official procedure
  // (how many questions get asked, pass marks, fees, the committee): none of
  // that is verifiable from here, and inventing it on a page aimed at people
  // going through a real citizenship process would be worse than saying less.
  'landing.faq.title': { ru: 'Прежде чем начать', el: 'Πριν ξεκινήσεις' },

  'landing.faq.q1': { ru: 'Сколько нужно готовиться?', el: 'Πόσο καιρό πρέπει να διαβάζω;' },
  'landing.faq.a1': {
    ru: 'Регулярность важнее срока: 10 минут каждый день дают больше, чем три часа раз в неделю. Здесь 160+ вопросов — по 10 за подход это две-три недели, чтобы увидеть весь материал. Дальше умное повторение само возвращает то, что начало забываться.',
    el: 'Η συνέπεια μετράει πιο πολύ από την προθεσμία: 10 λεπτά κάθε μέρα αποδίδουν περισσότερο από τρεις ώρες μια φορά τη βδομάδα. Εδώ υπάρχουν 160+ ερωτήσεις — με 10 ανά γύρο, σε δύο-τρεις βδομάδες έχεις δει όλο το υλικό. Μετά η έξυπνη επανάληψη σου επιστρέφει μόνη της ό,τι αρχίζεις να ξεχνάς.',
  },

  'landing.faq.q2': {
    ru: 'Почему карточки, а не просто список вопросов?',
    el: 'Γιατί κάρτες και όχι απλή λίστα ερωτήσεων;',
  },
  'landing.faq.a2': {
    ru: 'Список читаешь один раз и через три дня помнишь половину. Карточки работают на интервальном повторении: то, что даётся легко, показывается всё реже, а то, на чём спотыкаешься, возвращается быстрее. В итоге время уходит на слабые места, а не на уже выученное.',
    el: 'Τη λίστα τη διαβάζεις μια φορά και σε τρεις μέρες θυμάσαι τη μισή. Οι κάρτες δουλεύουν με επαναλήψεις σε διαστήματα: ό,τι σου βγαίνει εύκολα εμφανίζεται πιο αραιά, ό,τι σε δυσκολεύει επιστρέφει πιο γρήγορα. Έτσι ο χρόνος πηγαίνει στα αδύνατα σημεία, όχι σε όσα ξέρεις ήδη.',
  },

  'landing.faq.q3': {
    ru: 'Зачем озвучка, если вопрос и так понятен?',
    el: 'Γιατί χρειάζεται προφορά, αν καταλαβαίνω την ερώτηση;',
  },
  'landing.faq.a3': {
    ru: 'Потому что собеседование — это разговор, а не чтение. Узнать слово глазами и узнать его на слух — два разных навыка, и второй тренируется только слушанием. А имена вроде Ελευθέριος Βενιζέλος произносишь уверенно, когда слышал их, а не собирал по буквам.',
    el: 'Γιατί η συνέντευξη είναι συζήτηση, όχι ανάγνωση. Να αναγνωρίζεις μια λέξη με τα μάτια και να την αναγνωρίζεις με το αυτί είναι δύο διαφορετικές δεξιότητες, και η δεύτερη προπονείται μόνο ακούγοντας. Και ονόματα όπως Ελευθέριος Βενιζέλος τα λες με σιγουριά όταν τα έχεις ακούσει, αντί να τα μαντεύεις από τα γράμματα.',
  },

  'landing.faq.q4': { ru: 'На каком языке готовиться?', el: 'Σε ποια γλώσσα να προετοιμαστώ;' },
  'landing.faq.a4': {
    ru: 'Собеседование на греческом, поэтому и готовиться стоит на нём. Удобный путь: сначала пройди тему по-русски, чтобы понять смысл, потом переключи язык и пройди её заново по-гречески. Переключение — один тап, прогресс общий.',
    el: 'Η συνέντευξη γίνεται στα ελληνικά, άρα καλά είναι να προετοιμάζεσαι σε αυτά. Βολικός δρόμος: πέρνα πρώτα το θέμα στα ρωσικά για να πιάσεις το νόημα, μετά άλλαξε γλώσσα και ξανακάνε το στα ελληνικά. Η εναλλαγή είναι ένα άγγιγμα, η πρόοδος κοινή.',
  },

  'landing.faq.q5': { ru: 'Вопросы настоящие?', el: 'Οι ερωτήσεις είναι αληθινές;' },
  'landing.faq.a5': {
    ru: 'Темы те же четыре области, что разбирают на собеседовании: история, культура, законодательство и география Греции. Вопросы сформулированы так, чтобы проверять понимание, а не заученную строчку — одну тему ты встретишь в разных формулировках.',
    el: 'Τα θέματα είναι τα ίδια τέσσερα πεδία που συζητούνται στη συνέντευξη: ιστορία, πολιτισμός, νομοθεσία και γεωγραφία της Ελλάδας. Οι ερωτήσεις είναι γραμμένες ώστε να ελέγχουν την κατανόηση, όχι μια αποστηθισμένη γραμμή — το ίδιο θέμα θα το βρεις σε διαφορετικές διατυπώσεις.',
  },

  'landing.faq.q6': { ru: 'Бесплатно? Нужна регистрация?', el: 'Δωρεάν; Χρειάζεται εγγραφή;' },
  'landing.faq.a6': {
    ru: 'Полностью бесплатно: без карты, без подписки, без «премиума». Регистрация не нужна — заходи гостем и учись сразу. Аккаунт нужен только чтобы прогресс и серия сохранялись между устройствами.',
    el: 'Εντελώς δωρεάν: χωρίς κάρτα, χωρίς συνδρομή, χωρίς «premium». Εγγραφή δεν χρειάζεται — μπαίνεις ως επισκέπτης και ξεκινάς αμέσως. Ο λογαριασμός χρειάζεται μόνο για να κρατάς πρόοδο και σερί ανάμεσα σε συσκευές.',
  },
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
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);

  // Written synchronously (not in a useEffect) so it lands in localStorage
  // *before* React commits and fires descendants' effects. api.ts's
  // getStoredLanguage() is read from inside useCached's effect (ui.tsx), which
  // — being a descendant — commits before this provider's own effect would
  // (React runs effects bottom-up). A useEffect here would race: the very
  // first request after switching language would still read the OLD value,
  // permanently poisoning that language's cache entry with the wrong content.
  const setLanguage = (l: Language) => {
    localStorage.setItem(LANG_KEY, l);
    setLanguageState(l);
  };

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
