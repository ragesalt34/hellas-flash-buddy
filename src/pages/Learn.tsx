import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Layers, 
  BookOpen, 
  PenTool, 
  GraduationCap,
  History,
  Palette,
  Scale,
  MapPin,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function Learn() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();

  const topics = [
    {
      id: 'history',
      title: t('topic.history'),
      description: t('topic.history.desc'),
      icon: History,
      color: 'history',
      iconClass: 'bg-history/20 text-history group-hover:bg-history group-hover:text-white',
    },
    {
      id: 'culture',
      title: t('topic.culture'),
      description: t('topic.culture.desc'),
      icon: Palette,
      color: 'culture',
      iconClass: 'bg-culture/20 text-culture group-hover:bg-culture group-hover:text-white',
    },
    {
      id: 'laws',
      title: t('topic.laws'),
      description: t('topic.laws.desc'),
      icon: Scale,
      color: 'laws',
      iconClass: 'bg-laws/20 text-laws group-hover:bg-laws group-hover:text-white',
    },
    {
      id: 'geography',
      title: t('topic.geography'),
      description: t('topic.geography.desc'),
      icon: MapPin,
      color: 'geography',
      iconClass: 'bg-geography/20 text-geography group-hover:bg-geography group-hover:text-white',
    },
  ];

  const modes = [
    {
      id: 'flashcards',
      title: t('mode.flashcards'),
      description: t('mode.flashcards.desc'),
      icon: Layers,
    },
    {
      id: 'quiz',
      title: t('mode.quiz'),
      description: t('mode.quiz.desc'),
      icon: BookOpen,
    },
    {
      id: 'input',
      title: t('mode.input'),
      description: t('mode.input.desc'),
      icon: PenTool,
    },
    {
      id: 'exam',
      title: t('mode.exam'),
      description: t('mode.exam.desc'),
      icon: GraduationCap,
    },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <div className="relative container py-6 sm:py-12 px-4">

        <div className="relative mb-8 sm:mb-12">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            {t('learn.selectTopic')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            {t('learn.selectTopic.desc')}
          </p>
        </div>

        {/* Topics */}
        <div className="relative grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-12 sm:mb-16">
          {topics.map((topic, index) => (
            <Card 
              key={topic.id}
              className="group bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 animate-fade-in h-full flex flex-col"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-2 pt-6 flex-1">
                <div className={`w-12 sm:w-14 h-12 sm:h-14 rounded-xl flex items-center justify-center ${topic.iconClass} transition-all duration-300`}>
                  <topic.icon className="h-6 sm:h-7 w-6 sm:w-7 transition-colors duration-300" />
                </div>
                <CardTitle className="font-display text-lg sm:text-xl mt-4">{topic.title}</CardTitle>
                <CardDescription className="text-sm mt-1 min-h-[2.5rem]">{topic.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="grid grid-cols-2 gap-2">
                  {modes.map((mode) => (
                    <Link 
                      key={mode.id} 
                      to={`/learn/${topic.id}/${mode.id}`}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-9 justify-start gap-2 text-xs bg-muted/50 hover:bg-muted border-0"
                      >
                        <mode.icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{mode.title}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Exam Section */}
        <div className="relative mb-8 sm:mb-12">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4 sm:mb-6">
            {t('learn.takeExam')}
          </h2>
          <Card className="gradient-greek text-primary-foreground shadow-lg overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 blur-xl" />
            
            <CardHeader className="pb-4 relative">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="font-display text-xl sm:text-2xl text-primary-foreground">
                    {t('learn.examSimulation')}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 mt-2 text-sm sm:text-base">
                    {t('learn.examSimulation.desc')}
                  </CardDescription>
                </div>
                <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 opacity-50 shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <Link to="/learn/exam">
                <Button variant="secondary" size="lg" className="gap-2 w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  {t('learn.startExam')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
