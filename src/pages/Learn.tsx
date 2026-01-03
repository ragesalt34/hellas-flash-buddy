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
      bgClass: 'bg-history/10 hover:bg-history/20',
      textClass: 'text-history',
      borderClass: 'border-history/20',
    },
    {
      id: 'culture',
      title: t('topic.culture'),
      description: t('topic.culture.desc'),
      icon: Palette,
      color: 'culture',
      bgClass: 'bg-culture/10 hover:bg-culture/20',
      textClass: 'text-culture',
      borderClass: 'border-culture/20',
    },
    {
      id: 'laws',
      title: t('topic.laws'),
      description: t('topic.laws.desc'),
      icon: Scale,
      color: 'laws',
      bgClass: 'bg-laws/10 hover:bg-laws/20',
      textClass: 'text-laws',
      borderClass: 'border-laws/20',
    },
    {
      id: 'geography',
      title: t('topic.geography'),
      description: t('topic.geography.desc'),
      icon: MapPin,
      color: 'geography',
      bgClass: 'bg-geography/10 hover:bg-geography/20',
      textClass: 'text-geography',
      borderClass: 'border-geography/20',
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
      <div className="container py-12">
        <div className="mb-12">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {t('learn.selectTopic')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('learn.selectTopic.desc')}
          </p>
        </div>

        {/* Topics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {topics.map((topic, index) => (
            <Card 
              key={topic.id}
              className={`card-hover border ${topic.borderClass} ${topic.bgClass} cursor-pointer animate-fade-in`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${topic.bgClass} ${topic.textClass}`}>
                  <topic.icon className="h-7 w-7" />
                </div>
                <CardTitle className="font-display text-xl mt-4">{topic.title}</CardTitle>
                <CardDescription>{topic.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {modes.map((mode) => (
                    <Link 
                      key={mode.id} 
                      to={`/learn/${topic.id}/${mode.id}`}
                    >
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-9 justify-start gap-2 text-xs whitespace-nowrap overflow-hidden"
                      >
                        <mode.icon className="h-3 w-3 flex-shrink-0" />
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
        <div className="mb-12">
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            {t('learn.takeExam')}
          </h2>
          <Card className="gradient-greek text-primary-foreground">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-2xl text-primary-foreground">
                    {t('learn.examSimulation')}
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 mt-2">
                    {t('learn.examSimulation.desc')}
                  </CardDescription>
                </div>
                <GraduationCap className="h-16 w-16 opacity-50" />
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/learn/exam">
                <Button variant="secondary" size="lg" className="gap-2">
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
