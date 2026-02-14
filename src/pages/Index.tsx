import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, GraduationCap, Layers, History, Palette, 
  Scale, MapPin, ArrowRight, CheckCircle, Sparkles, Trophy, Clock, TrendingUp
} from 'lucide-react';

// Aurora blob component
const AuroraBlob = ({ className, delay = "0" }: { className?: string; delay?: string }) => (
  <div 
    className={`absolute rounded-full aurora-blob ${className}`}
    style={{ animationDelay: delay }}
  />
);

// Scroll reveal hook
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const ScrollReveal = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useScrollReveal();
  return <div ref={ref} className={`scroll-reveal ${className}`}>{children}</div>;
};

// Stat card
const StatCard = ({ icon: Icon, number, label, delay }: { 
  icon: React.ElementType; 
  number: string; 
  label: string;
  delay: string;
}) => (
  <div 
    className="liquid-glass-card-v2 rounded-2xl p-6 flex flex-col items-center text-center opacity-0 animate-fade-in-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-12 h-12 rounded-xl gradient-greek opacity-80 flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-primary-foreground" />
    </div>
    <div className="font-display text-2xl sm:text-4xl font-bold text-gradient-aurora mb-1 pb-1" style={{ textShadow: '0 0 30px hsl(234 89% 74% / 0.2)' }}>{number}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

// Topic card
const TopicCard = ({ topic, index, isExpanded, onToggle }: { topic: any; index: number; isExpanded: boolean; onToggle: () => void }) => {
  const Icon = topic.icon;
  const colorClasses: Record<string, string> = {
    history: 'hover:border-history/40',
    culture: 'hover:border-culture/40',
    laws: 'hover:border-laws/40',
    geography: 'hover:border-geography/40',
  };
  const iconColorClasses: Record<string, string> = {
    history: 'bg-history/15 text-history group-hover:bg-history group-hover:text-primary-foreground',
    culture: 'bg-culture/15 text-culture group-hover:bg-culture group-hover:text-primary-foreground',
    laws: 'bg-laws/15 text-laws group-hover:bg-laws group-hover:text-primary-foreground',
    geography: 'bg-geography/15 text-geography group-hover:bg-geography group-hover:text-primary-foreground',
  };
  const accentColors: Record<string, string> = {
    history: 'bg-history',
    culture: 'bg-culture',
    laws: 'bg-laws',
    geography: 'bg-geography',
  };
  const bgGradients: Record<string, string> = {
    history: 'radial-gradient(ellipse at 80% 0%, hsl(210 100% 62% / 0.06) 0%, transparent 60%)',
    culture: 'radial-gradient(ellipse at 80% 0%, hsl(280 70% 68% / 0.06) 0%, transparent 60%)',
    laws: 'radial-gradient(ellipse at 80% 0%, hsl(145 60% 55% / 0.06) 0%, transparent 60%)',
    geography: 'radial-gradient(ellipse at 80% 0%, hsl(35 95% 60% / 0.06) 0%, transparent 60%)',
  };
  
  return (
    <div 
      className={`group relative liquid-glass-card-v2 rounded-2xl ${colorClasses[topic.id]} 
        p-5 sm:p-6 text-left opacity-0 animate-fade-in-up cursor-pointer`}
      style={{ animationDelay: `${200 + index * 100}ms`, backgroundImage: bgGradients[topic.id] }}
      onClick={onToggle}
    >
      <div className={`absolute top-0 left-6 right-6 h-0.5 rounded-full ${accentColors[topic.id]} opacity-50`} />
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${iconColorClasses[topic.id]} flex items-center justify-center mb-3 sm:mb-4
        transition-all duration-500 spring-transition group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="h-6 w-6 sm:h-7 sm:w-7 transition-colors duration-300" />
      </div>
      <h3 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">{topic.title}</h3>
      <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{topic.description}</p>
      {/* Details: hover on desktop, click on mobile */}
      <div className={`overflow-hidden transition-all duration-500 ease-out
        ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 sm:group-hover:max-h-40 sm:group-hover:opacity-100'}`}>
        <ul className="mt-3 space-y-1 border-t border-border/30 pt-3">
          {topic.details?.map((item: string, i: number) => (
            <li key={i} className="text-xs text-muted-foreground/80 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className={`absolute bottom-5 sm:bottom-6 right-5 sm:right-6 transform transition-all duration-500 spring-transition
        ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 sm:group-hover:opacity-100 sm:group-hover:translate-x-0'}`}>
        <ArrowRight className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
};

// Learning mode card
const ModeCard = ({ mode, index }: { mode: any; index: number }) => {
  const Icon = mode.icon;
  
  return (
    <div 
      className="group relative liquid-glass-card-v2 rounded-2xl p-6 text-left opacity-0 animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${300 + index * 100}ms` }}
    >
      <span className="absolute top-3 right-4 text-5xl font-bold text-foreground/[0.04] font-display select-none">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="w-11 h-11 rounded-xl glass-button-v2 flex items-center justify-center mb-4
        transition-all duration-500 spring-transition group-hover:gradient-greek group-hover:shadow-lg group-hover:shadow-primary/20">
        <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{mode.title}</h3>
      <p className="text-muted-foreground text-sm">{mode.description}</p>
    </div>
  );
};

export default function Index() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const { data: questionsCount } = useQuery({
    queryKey: ['questions-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const topicDetails: Record<string, string[]> = language === 'ru' 
    ? {
        history: ['Древняя Эллада и Античность', 'Византийская империя', 'Османский период', 'Война за независимость', 'Современная Греция и ЕС'],
        culture: ['Национальные праздники', 'Православные традиции', 'Греческая кухня', 'Музыка и танцы', 'Символы и обычаи'],
        laws: ['Конституция Греции', 'Права и обязанности граждан', 'Структура правительства', 'Избирательная система', 'Процесс натурализации'],
        geography: ['Регионы и префектуры', 'Крупные города', 'Острова и архипелаги', 'Горы и реки', 'Климат и природа'],
      }
    : {
        history: ['Αρχαία Ελλάδα', 'Βυζαντινή Αυτοκρατορία', 'Οθωμανική περίοδος', 'Πόλεμος Ανεξαρτησίας', 'Σύγχρονη Ελλάδα και ΕΕ'],
        culture: ['Εθνικές εορτές', 'Ορθόδοξες παραδόσεις', 'Ελληνική κουζίνα', 'Μουσική και χοροί', 'Σύμβολα και έθιμα'],
        laws: ['Σύνταγμα της Ελλάδας', 'Δικαιώματα και υποχρεώσεις', 'Δομή κυβέρνησης', 'Εκλογικό σύστημα', 'Διαδικασία πολιτογράφησης'],
        geography: ['Περιφέρειες', 'Μεγάλες πόλεις', 'Νησιά και αρχιπελάγη', 'Βουνά και ποτάμια', 'Κλίμα και φύση'],
      };

  const topics = [
    { id: 'history', title: t('topic.history'), description: t('topic.history.desc'), icon: History, details: topicDetails.history },
    { id: 'culture', title: t('topic.culture'), description: t('topic.culture.desc'), icon: Palette, details: topicDetails.culture },
    { id: 'laws', title: t('topic.laws'), description: t('topic.laws.desc'), icon: Scale, details: topicDetails.laws },
    { id: 'geography', title: t('topic.geography'), description: t('topic.geography.desc'), icon: MapPin, details: topicDetails.geography },
  ];

  const learningModes = [
    { id: 'flashcards', title: t('mode.flashcards'), description: t('mode.flashcards.desc'), icon: Layers },
    { id: 'quiz', title: t('mode.quiz'), description: t('mode.quiz.desc'), icon: BookOpen },
    { id: 'exam', title: t('mode.exam'), description: t('mode.exam.desc'), icon: GraduationCap },
  ];

  const features = language === 'ru' 
    ? ['Более 300 вопросов', 'Отслеживание прогресса', '3 режима изучения', 'Симуляция экзамена']
    : ['Πάνω από 300 ερωτήσεις', 'Παρακολούθηση προόδου', '3 τρόποι μάθησης', 'Προσομοίωση εξέτασης'];

  const stats = language === 'ru'
    ? [
        { icon: BookOpen, number: `${questionsCount || 0}`, label: 'Вопросов' },
        { icon: Sparkles, number: 'Бесплатно', label: 'Полный доступ навсегда' },
        { icon: Clock, number: '24/7', label: 'Доступ' },
      ]
    : [
        { icon: BookOpen, number: `${questionsCount || 0}`, label: 'Ερωτήσεις' },
        { icon: Sparkles, number: 'Δωρεάν', label: 'Πλήρης πρόσβαση για πάντα' },
        { icon: Clock, number: '24/7', label: 'Πρόσβαση' },
      ];

  return (
    <Layout>
      {/* Hero + Stats wrapper with shared aurora background */}
      <div className="relative overflow-hidden">
      {/* Aurora mesh background spanning hero + stats */}
      <div className="absolute inset-0 aurora-bg" />
      <div className="absolute inset-0 hero-grid-pattern opacity-40" />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Aurora blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <AuroraBlob className="w-[400px] h-[400px] sm:w-[700px] sm:h-[700px] -top-32 -left-32" delay="0s" />
          <AuroraBlob className="w-[300px] h-[300px] sm:w-[550px] sm:h-[550px] top-1/4 -right-32" delay="3s" />
          <AuroraBlob className="hidden sm:block w-[450px] h-[450px] bottom-0 left-1/3" delay="6s" />
        </div>

        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-button-v2 animated-border mb-8 opacity-0 animate-fade-in-up">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium text-foreground">
                {language === 'ru' ? 'Подготовка к гражданству Греции' : 'Προετοιμασία για την ελληνική ιθαγένεια'}
              </span>
            </div>

            {/* Heading with aurora gradient text + glow */}
            <h1 className="font-display font-bold tracking-tight text-foreground opacity-0 animate-fade-in-up animate-delay-100">
              <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl hero-glow-text">
                {language === 'ru' ? 'Ваш путь к' : 'Ο δρόμος σας προς την'}
              </span>
              <span className="block mt-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-gradient-aurora pb-2 hero-glow-text">
                {language === 'ru' ? 'греческому гражданству' : 'ελληνική ιθαγένεια'}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in-up animate-delay-200">
              {t('index.hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
              {user ? (
                <Link to="/learn">
                  <Button size="lg" className="w-full sm:w-auto gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/35 transition-all duration-500 spring-transition rounded-xl animate-pulse-glow">
                    {t('index.startLearning')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/20 hover:shadow-primary/35 transition-all duration-500 spring-transition rounded-xl animate-pulse-glow">
                      {language === 'ru' ? 'Начать бесплатно' : 'Ξεκινήστε δωρεάν'}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-6 text-lg glass-button-v2 rounded-xl">
                      {language === 'ru' ? 'У меня есть аккаунт' : 'Έχω λογαριασμό'}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Feature pills */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 items-stretch opacity-0 animate-fade-in-up animate-delay-400">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="glass-button-v2 rounded-full py-2.5 px-4 text-sm text-muted-foreground grid grid-cols-[1rem_1fr_1rem] items-center gap-2 min-h-10"
                >
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-center leading-snug">{feature}</span>
                  <span className="h-4 w-4" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator - hidden on mobile */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in-up animate-delay-700 hidden sm:block">
          <div className="w-7 h-11 rounded-full glass-button-v2 flex justify-center pt-2.5">
            <div className="w-1.5 h-3 rounded-full bg-primary/50 animate-float" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pt-8 pb-20 relative">
        <div className="container relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} delay={`${i * 150}ms`} />
            ))}
          </div>
        </div>
      </section>
      </div>

      {/* Topics Section */}
      <section className="py-16 relative overflow-hidden">
        <AuroraBlob className="w-[400px] h-[400px] -top-24 -right-24" delay="0s" />
        <div className="container relative">
          <ScrollReveal>
            <div className="text-center mb-16 px-4">
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
                {language === 'ru' ? 'Темы для изучения' : 'Θέματα για μελέτη'}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {language === 'ru' 
                  ? 'Выберите тему и начните подготовку к экзамену' 
                  : 'Επιλέξτε ένα θέμα και ξεκινήστε την προετοιμασία για την εξέταση'}
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic, i) => (
              <TopicCard 
                key={topic.id} 
                topic={topic} 
                index={i} 
                isExpanded={expandedTopic === topic.id}
                onToggle={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Learning Modes Section */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
        <AuroraBlob className="w-[300px] h-[300px] top-1/4 -left-24" delay="2s" />
        <div className="container relative">
          <ScrollReveal>
            <div className="text-center mb-16 px-4">
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
                {language === 'ru' ? 'Режимы обучения' : 'Τρόποι μάθησης'}
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {language === 'ru' 
                  ? 'Различные способы изучения материала для максимальной эффективности' 
                  : 'Διάφοροι τρόποι μελέτης για μέγιστη αποτελεσματικότητα'}
              </p>
            </div>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            {learningModes.map((mode, i) => (
              <ModeCard key={mode.id} mode={mode} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-12 sm:py-24 relative overflow-hidden">
          <div className="absolute inset-0 gradient-greek opacity-90" />
          <AuroraBlob className="w-[450px] h-[450px] -top-32 right-0 opacity-30" delay="0s" />
          <AuroraBlob className="w-[350px] h-[350px] bottom-0 -left-24 opacity-20" delay="4s" />
          
          <div className="container relative z-10 text-center px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                {language === 'ru' ? 'Готовы начать подготовку?' : 'Είστε έτοιμοι να ξεκινήσετε;'}
              </h2>
              <p className="text-primary-foreground/80 text-lg md:text-xl mb-10">
                {language === 'ru' 
                  ? 'Зарегистрируйтесь бесплатно и получите доступ ко всем материалам для подготовки к экзамену на гражданство Греции' 
                  : 'Εγγραφείτε δωρεάν και αποκτήστε πρόσβαση σε όλο το υλικό για την προετοιμασία για την εξέταση ελληνικής ιθαγένειας'}
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="px-10 py-6 text-lg gap-2 shadow-2xl hover:shadow-primary/20 transition-all duration-500 spring-transition hover:-translate-y-1 rounded-xl">
                  {language === 'ru' ? 'Создать аккаунт' : 'Δημιουργία λογαριασμού'} 
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

    </Layout>
  );
}
