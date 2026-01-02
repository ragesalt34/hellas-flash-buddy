import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, GraduationCap, Layers, PenTool, History, Palette, Scale, MapPin, ArrowRight, CheckCircle } from 'lucide-react';

export default function Index() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const topics = [
    { id: 'history', title: t('topic.history'), description: t('topic.history.desc'), icon: History, color: 'bg-history/10 text-history border-history/20' },
    { id: 'culture', title: t('topic.culture'), description: t('topic.culture.desc'), icon: Palette, color: 'bg-culture/10 text-culture border-culture/20' },
    { id: 'laws', title: t('topic.laws'), description: t('topic.laws.desc'), icon: Scale, color: 'bg-laws/10 text-laws border-laws/20' },
    { id: 'geography', title: t('topic.geography'), description: t('topic.geography.desc'), icon: MapPin, color: 'bg-geography/10 text-geography border-geography/20' },
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

  return (
    <Layout>
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 gradient-greek opacity-5" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {language === 'ru' ? (
                <>Ваш путь к <span className="text-gradient">греческому гражданству</span></>
              ) : (
                <>Ο δρόμος σας προς την <span className="text-gradient">ελληνική ιθαγένεια</span></>
              )}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              {t('index.hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/learn"><Button size="lg" className="gradient-greek text-primary-foreground gap-2">{t('index.startLearning')} <ArrowRight className="h-5 w-5" /></Button></Link>
              ) : (
                <>
                  <Link to="/register"><Button size="lg" className="gradient-greek text-primary-foreground gap-2">{language === 'ru' ? 'Начать бесплатно' : 'Ξεκινήστε δωρεάν'} <ArrowRight className="h-5 w-5" /></Button></Link>
                  <Link to="/login"><Button variant="outline" size="lg">{language === 'ru' ? 'У меня есть аккаунт' : 'Έχω λογαριασμό'}</Button></Link>
                </>
              )}
            </div>
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" /><span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-secondary/30">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">
            {language === 'ru' ? 'Темы для изучения' : 'Θέματα για μελέτη'}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {topics.map((topic) => (
              <Card key={topic.id} className={`card-hover border ${topic.color}`}>
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${topic.color}`}><topic.icon className="h-6 w-6" /></div>
                  <CardTitle className="font-display text-xl">{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <h2 className="font-display text-3xl font-bold text-foreground text-center mb-12">
            {language === 'ru' ? 'Режимы обучения' : 'Τρόποι μάθησης'}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {learningModes.map((mode) => (
              <Card key={mode.id} className="card-hover">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><mode.icon className="h-6 w-6" /></div>
                  <CardTitle className="font-display text-lg">{mode.title}</CardTitle>
                  <CardDescription className="text-sm">{mode.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {!user && (
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container text-center">
            <h2 className="font-display text-3xl font-bold">
              {language === 'ru' ? 'Готовы начать подготовку?' : 'Είστε έτοιμοι να ξεκινήσετε;'}
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              {language === 'ru' ? 'Зарегистрируйтесь бесплатно и получите доступ ко всем материалам' : 'Εγγραφείτε δωρεάν και αποκτήστε πρόσβαση σε όλο το υλικό'}
            </p>
            <Link to="/register"><Button size="lg" variant="secondary" className="mt-8 gap-2">{language === 'ru' ? 'Создать аккаунт' : 'Δημιουργία λογαριασμού'} <ArrowRight className="h-5 w-5" /></Button></Link>
          </div>
        </section>
      )}
    </Layout>
  );
}
