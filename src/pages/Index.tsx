import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BookOpen, GraduationCap, Layers, PenTool, History, Palette, 
  Scale, MapPin, ArrowRight, CheckCircle, Sparkles, Trophy, Clock, TrendingUp
} from 'lucide-react';

// Floating glass orb component
const FloatingOrb = ({ className, delay = "0" }: { className?: string; delay?: string }) => (
  <div 
    className={`absolute rounded-full floating-orb-glass ${className}`}
    style={{ animationDelay: delay }}
  />
);

// Stat card component with liquid glass
const StatCard = ({ icon: Icon, number, label, delay }: { 
  icon: React.ElementType; 
  number: string; 
  label: string;
  delay: string;
}) => (
  <div 
    className="liquid-glass-card rounded-2xl p-6 flex flex-col items-center text-center opacity-0 animate-fade-in-up"
    style={{ animationDelay: delay }}
  >
    <div className="w-14 h-14 rounded-xl liquid-glass-button flex items-center justify-center mb-4">
      <Icon className="h-7 w-7 text-primary" />
    </div>
    <div className="font-display text-3xl font-bold text-foreground mb-1">{number}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

// Topic card component with liquid glass
const TopicCard = ({ topic, index }: { topic: any; index: number }) => {
  const Icon = topic.icon;
  const colorClasses: Record<string, string> = {
    history: 'hover:border-history/50',
    culture: 'hover:border-culture/50',
    laws: 'hover:border-laws/50',
    geography: 'hover:border-geography/50',
  };
  const iconColorClasses: Record<string, string> = {
    history: 'bg-history/20 text-history group-hover:bg-history group-hover:text-white',
    culture: 'bg-culture/20 text-culture group-hover:bg-culture group-hover:text-white',
    laws: 'bg-laws/20 text-laws group-hover:bg-laws group-hover:text-white',
    geography: 'bg-geography/20 text-geography group-hover:bg-geography group-hover:text-white',
  };
  
  return (
    <div 
      className={`group relative liquid-glass-card rounded-2xl ${colorClasses[topic.id]} 
        p-6 text-left opacity-0 animate-fade-in-up cursor-pointer`}
      style={{ animationDelay: `${200 + index * 100}ms` }}
    >
      <div className={`w-14 h-14 rounded-xl ${iconColorClasses[topic.id]} flex items-center justify-center mb-4
        transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="h-7 w-7 transition-colors duration-300" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{topic.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{topic.description}</p>
      <div className="absolute bottom-6 right-6 opacity-0 transform translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
        <ArrowRight className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
};

// Learning mode card with liquid glass
const ModeCard = ({ mode, index }: { mode: any; index: number }) => {
  const Icon = mode.icon;
  
  return (
    <div 
      className="group liquid-glass-card rounded-2xl p-6 text-left opacity-0 animate-fade-in-up cursor-pointer"
      style={{ animationDelay: `${300 + index * 100}ms` }}
    >
      <div className="w-12 h-12 rounded-xl liquid-glass-button flex items-center justify-center mb-4
        transition-all duration-300 group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/30">
        <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">{mode.title}</h3>
      <p className="text-muted-foreground text-sm">{mode.description}</p>
    </div>
  );
};

export default function Index() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  // Fetch questions count from database
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

  const topics = [
    { id: 'history', title: t('topic.history'), description: t('topic.history.desc'), icon: History },
    { id: 'culture', title: t('topic.culture'), description: t('topic.culture.desc'), icon: Palette },
    { id: 'laws', title: t('topic.laws'), description: t('topic.laws.desc'), icon: Scale },
    { id: 'geography', title: t('topic.geography'), description: t('topic.geography.desc'), icon: MapPin },
  ];

  const learningModes = [
    { id: 'flashcards', title: t('mode.flashcards'), description: t('mode.flashcards.desc'), icon: Layers },
    { id: 'quiz', title: t('mode.quiz'), description: t('mode.quiz.desc'), icon: BookOpen },
    { id: 'input', title: t('mode.input'), description: t('mode.input.desc'), icon: PenTool },
    { id: 'exam', title: t('mode.exam'), description: t('mode.exam.desc'), icon: GraduationCap },
  ];

  const features = language === 'ru' 
    ? ['Более 300 вопросов', 'Отслеживание прогресса', '4 режима изучения', 'Симуляция экзамена']
    : ['Πάνω από 300 ερωτήσεις', 'Παρακολούθηση προόδου', '4 τρόποι μάθησης', 'Προσομοίωση εξέτασης'];

  const stats = language === 'ru'
    ? [
        { icon: BookOpen, number: `${questionsCount || 0}`, label: 'Вопросов' },
        { icon: TrendingUp, number: '+30%', label: 'Повышение эффективности' },
        { icon: Clock, number: '24/7', label: 'Доступ' },
      ]
    : [
        { icon: BookOpen, number: `${questionsCount || 0}`, label: 'Ερωτήσεις' },
        { icon: TrendingUp, number: '+30%', label: 'Αύξηση αποτελεσματικότητας' },
        { icon: Clock, number: '24/7', label: 'Πρόσβαση' },
      ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 gradient-greek-radial" />

        {/* Background decorations (clipped) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* Floating glass orbs */}
          <FloatingOrb className="w-[420px] h-[420px] -top-24 -left-24" delay="0s" />
          <FloatingOrb className="w-[380px] h-[380px] top-1/3 -right-24" delay="2s" />
          <FloatingOrb className="w-[300px] h-[300px] bottom-10 left-1/4" delay="4s" />
          <FloatingOrb className="w-[200px] h-[200px] top-16 right-1/4" delay="1s" />

          {/* Decorative glass shapes (hidden on mobile to avoid "лишний элемент") */}
          <div className="hidden sm:block absolute top-1/4 left-10 w-20 h-20 liquid-glass rounded-2xl rotate-12 opacity-40 animate-float" />
          <div className="hidden sm:block absolute bottom-1/4 right-20 w-16 h-16 liquid-glass rounded-full opacity-30 animate-float-slow" />
          <div
            className="hidden sm:block absolute top-1/2 left-1/4 w-12 h-12 liquid-glass rounded-xl -rotate-12 opacity-20 animate-float"
            style={{ animationDelay: '2s' }}
          />
        </div>

        {/* Greek pattern decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge with liquid glass */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full liquid-glass glow-border mb-8 opacity-0 animate-fade-in-up">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                {language === 'ru' ? 'Подготовка к гражданству Греции' : 'Προετοιμασία για την ελληνική ιθαγένεια'}
              </span>
            </div>

            {/* Heading with shimmer effect */}
            <h1 className="font-display font-bold tracking-tight text-foreground opacity-0 animate-fade-in-up animate-delay-100">
              <span className="block text-4xl sm:text-5xl md:text-6xl">
                {language === 'ru' ? 'Ваш путь к' : 'Ο δρόμος σας προς την'}
              </span>
              <span className="block mt-2 text-5xl sm:text-6xl md:text-7xl text-shimmer">
                {language === 'ru' ? 'греческому гражданству' : 'ελληνική ιθαγένεια'}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in-up animate-delay-200">
              {t('index.hero.subtitle')}
            </p>

            {/* CTA Buttons with liquid glass */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
              {user ? (
                <Link to="/learn">
                  <Button size="lg" className="gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300">
                    {t('index.startLearning')}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300">
                      {language === 'ru' ? 'Начать бесплатно' : 'Ξεκινήστε δωρεάν'}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="px-8 py-6 text-lg liquid-glass-button">
                      {language === 'ru' ? 'У меня есть аккаунт' : 'Έχω λογαριασμό'}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Features list with liquid glass */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch opacity-0 animate-fade-in-up animate-delay-400">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="liquid-glass-button rounded-full py-2.5 px-4 text-sm text-muted-foreground grid grid-cols-[1rem_1fr_1rem] items-center gap-2 min-h-10"
                >
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-center leading-snug">{feature}</span>
                  <span className="h-4 w-4" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in-up animate-delay-700">
          <div className="w-8 h-12 rounded-full liquid-glass flex justify-center pt-3">
            <div className="w-1.5 h-3 rounded-full bg-primary/60 animate-float" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-secondary/50 to-secondary/30" />
        <FloatingOrb className="w-[250px] h-[250px] top-0 right-10" delay="1s" />
        <FloatingOrb className="w-[180px] h-[180px] bottom-0 left-20" delay="3s" />
        <div className="container relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} delay={`${i * 150}ms`} />
            ))}
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section className="py-24 relative overflow-hidden">
        <FloatingOrb className="w-[350px] h-[350px] -top-20 -right-20" delay="0s" />
        <FloatingOrb className="w-[200px] h-[200px] bottom-20 left-10" delay="2s" />
        <div className="container relative">
          <div className="text-center mb-16 px-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 opacity-0 animate-fade-in-up">
              {language === 'ru' ? 'Темы для изучения' : 'Θέματα για μελέτη'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto opacity-0 animate-fade-in-up animate-delay-100">
              {language === 'ru' 
                ? 'Выберите тему и начните подготовку к экзамену' 
                : 'Επιλέξτε ένα θέμα και ξεκινήστε την προετοιμασία για την εξέταση'}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic, i) => (
              <TopicCard key={topic.id} topic={topic} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Learning Modes Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
        <FloatingOrb className="w-[280px] h-[280px] top-1/4 -left-20" delay="1s" />
        <div className="container relative">
          <div className="text-center mb-16 px-4">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4 opacity-0 animate-fade-in-up">
              {language === 'ru' ? 'Режимы обучения' : 'Τρόποι μάθησης'}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto opacity-0 animate-fade-in-up animate-delay-100">
              {language === 'ru' 
                ? 'Различные способы изучения материала для максимальной эффективности' 
                : 'Διάφοροι τρόποι μελέτης για μέγιστη αποτελεσματικότητα'}
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {learningModes.map((mode, i) => (
              <ModeCard key={mode.id} mode={mode} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with liquid glass */}
      {!user && (
        <section className="py-24 relative overflow-hidden">
          {/* Background gradient mesh */}
          <div className="absolute inset-0 gradient-greek opacity-90" />
          <FloatingOrb className="w-[400px] h-[400px] -top-32 right-0 opacity-40" delay="0s" />
          <FloatingOrb className="w-[300px] h-[300px] bottom-0 -left-20 opacity-30" delay="3s" />
          
          {/* Decorative glass elements */}
          <div className="absolute top-1/4 right-1/4 w-24 h-24 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm rotate-12 animate-float" />
          <div className="absolute bottom-1/4 left-1/3 w-16 h-16 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm animate-float-slow" />
          
          <div className="container relative z-10 text-center px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
                {language === 'ru' ? 'Готовы начать подготовку?' : 'Είστε έτοιμοι να ξεκινήσετε;'}
              </h2>
              <p className="text-primary-foreground/80 text-lg md:text-xl mb-10">
                {language === 'ru' 
                  ? 'Зарегистрируйтесь бесплатно и получите доступ ко всем материалам для подготовки к экзамену на гражданство Греции' 
                  : 'Εγγραφείτε δωρεάν και αποκτήστε πρόσβαση σε όλο το υλικό για την προετοιμασία για την εξέταση ελληνικής ιθαγένειας'}
              </p>
              <Link to="/register">
                <Button size="lg" variant="secondary" className="px-10 py-6 text-lg gap-2 shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-1">
                  {language === 'ru' ? 'Создать аккаунт' : 'Δημιουργία λογαριασμού'} 
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer wave decoration */}
      <div className="h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </Layout>
  );
}
