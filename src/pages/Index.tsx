import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  BookOpen, GraduationCap, Layers, PenTool, History, Palette, 
  Scale, MapPin, ArrowRight, CheckCircle, Sparkles, Users, Trophy, Clock
} from 'lucide-react';

// Floating decorative element component
const FloatingOrb = ({ className, delay = "0" }: { className?: string; delay?: string }) => (
  <div 
    className={`absolute rounded-full blur-3xl opacity-30 animate-blob ${className}`}
    style={{ animationDelay: delay }}
  />
);

// Stat card component
const StatCard = ({ icon: Icon, number, label, delay }: { 
  icon: React.ElementType; 
  number: string; 
  label: string;
  delay: string;
}) => (
  <div 
    className={`glass rounded-2xl p-6 text-center hover-lift opacity-0 animate-fade-in-up`}
    style={{ animationDelay: delay }}
  >
    <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <div className="font-display text-3xl font-bold text-foreground mb-1">{number}</div>
    <div className="text-sm text-muted-foreground">{label}</div>
  </div>
);

// Topic card component with glassmorphism
const TopicCard = ({ topic, index }: { topic: any; index: number }) => {
  const Icon = topic.icon;
  const colorClasses: Record<string, string> = {
    history: 'from-history/20 to-history/5 border-history/30 hover:border-history/60',
    culture: 'from-culture/20 to-culture/5 border-culture/30 hover:border-culture/60',
    laws: 'from-laws/20 to-laws/5 border-laws/30 hover:border-laws/60',
    geography: 'from-geography/20 to-geography/5 border-geography/30 hover:border-geography/60',
  };
  const iconColorClasses: Record<string, string> = {
    history: 'bg-history/20 text-history',
    culture: 'bg-culture/20 text-culture',
    laws: 'bg-laws/20 text-laws',
    geography: 'bg-geography/20 text-geography',
  };
  
  return (
    <div 
      className={`group relative rounded-2xl border bg-gradient-to-br ${colorClasses[topic.id]} 
        backdrop-blur-sm p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl
        opacity-0 animate-fade-in-up`}
      style={{ animationDelay: `${200 + index * 100}ms` }}
    >
      <div className={`w-14 h-14 rounded-xl ${iconColorClasses[topic.id]} flex items-center justify-center mb-4
        transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">{topic.title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{topic.description}</p>
      <div className="absolute bottom-6 right-6 opacity-0 transform translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
};

// Learning mode card
const ModeCard = ({ mode, index }: { mode: any; index: number }) => {
  const Icon = mode.icon;
  
  return (
    <div 
      className={`group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 
        transition-all duration-500 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30
        opacity-0 animate-fade-in-up`}
      style={{ animationDelay: `${300 + index * 100}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4
        transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
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
        { icon: BookOpen, number: '300+', label: 'Вопросов' },
        { icon: Users, number: '1000+', label: 'Пользователей' },
        { icon: Trophy, number: '95%', label: 'Успешность' },
        { icon: Clock, number: '24/7', label: 'Доступ' },
      ]
    : [
        { icon: BookOpen, number: '300+', label: 'Ερωτήσεις' },
        { icon: Users, number: '1000+', label: 'Χρήστες' },
        { icon: Trophy, number: '95%', label: 'Επιτυχία' },
        { icon: Clock, number: '24/7', label: 'Πρόσβαση' },
      ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 gradient-greek-radial" />
        
        {/* Floating orbs */}
        <FloatingOrb className="w-96 h-96 bg-primary -top-20 -left-20" delay="0s" />
        <FloatingOrb className="w-80 h-80 bg-accent top-1/2 -right-20" delay="2s" />
        <FloatingOrb className="w-64 h-64 bg-primary/50 bottom-20 left-1/3" delay="4s" />

        {/* Greek pattern decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="container relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 opacity-0 animate-fade-in-up">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">
                {language === 'ru' ? 'Подготовка к гражданству Греции' : 'Προετοιμασία για την ελληνική ιθαγένεια'}
              </span>
            </div>

            {/* Heading */}
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground opacity-0 animate-fade-in-up animate-delay-100">
              {language === 'ru' ? (
                <>Ваш путь к <br /><span className="text-gradient">греческому гражданству</span></>
              ) : (
                <>Ο δρόμος σας προς την <br /><span className="text-gradient">ελληνική ιθαγένεια</span></>
              )}
            </h1>

            {/* Subtitle */}
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto opacity-0 animate-fade-in-up animate-delay-200">
              {t('index.hero.subtitle')}
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up animate-delay-300">
              {user ? (
                <Link to="/learn">
                  <Button size="lg" className="gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg hover-glow">
                    {t('index.startLearning')} 
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gradient-greek text-primary-foreground gap-2 px-8 py-6 text-lg hover-glow">
                      {language === 'ru' ? 'Начать бесплатно' : 'Ξεκινήστε δωρεάν'} 
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg" className="px-8 py-6 text-lg glass border-border/50 hover:bg-card/80">
                      {language === 'ru' ? 'У меня есть аккаунт' : 'Έχω λογαριασμό'}
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Features list */}
            <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-0 animate-fade-in-up animate-delay-400">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 animate-fade-in-up animate-delay-700">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2">
            <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50 animate-float" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-secondary/30" />
        <div className="container relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} delay={`${i * 100}ms`} />
            ))}
          </div>
        </div>
      </section>

      {/* Topics Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="container relative">
          <div className="text-center mb-16">
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
      <section className="py-24 relative bg-gradient-to-b from-transparent via-secondary/20 to-transparent">
        <div className="container">
          <div className="text-center mb-16">
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

      {/* CTA Section */}
      {!user && (
        <section className="py-24 relative overflow-hidden">
          {/* Background gradient mesh */}
          <div className="absolute inset-0 gradient-greek opacity-90" />
          <FloatingOrb className="w-96 h-96 bg-accent/30 -top-20 right-0" delay="0s" />
          <FloatingOrb className="w-64 h-64 bg-primary-foreground/10 bottom-0 left-20" delay="3s" />
          
          <div className="container relative z-10 text-center">
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
                <Button size="lg" variant="secondary" className="px-10 py-6 text-lg gap-2 hover-lift">
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
