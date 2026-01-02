import { Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Layers, 
  BookOpen, 
  PenTool, 
  GraduationCap,
  History,
  Palette,
  Scale,
  ArrowRight,
  Loader2
} from 'lucide-react';

const topics = [
  {
    id: 'history',
    title: 'История Греции',
    description: 'Древняя Эллада, Византия, современная история',
    icon: History,
    color: 'history',
    bgClass: 'bg-history/10 hover:bg-history/20',
    textClass: 'text-history',
    borderClass: 'border-history/20',
  },
  {
    id: 'culture',
    title: 'Культура и традиции',
    description: 'Праздники, обычаи, символы Греции',
    icon: Palette,
    color: 'culture',
    bgClass: 'bg-culture/10 hover:bg-culture/20',
    textClass: 'text-culture',
    borderClass: 'border-culture/20',
  },
  {
    id: 'laws',
    title: 'Законы и политика',
    description: 'Конституция, права граждан, госустройство',
    icon: Scale,
    color: 'laws',
    bgClass: 'bg-laws/10 hover:bg-laws/20',
    textClass: 'text-laws',
    borderClass: 'border-laws/20',
  },
];

const modes = [
  {
    id: 'flashcards',
    title: 'Флэш-карточки',
    description: 'Переворачивайте карточки для изучения',
    icon: Layers,
  },
  {
    id: 'quiz',
    title: 'Тест с вариантами',
    description: 'Выберите правильный ответ из 4 вариантов',
    icon: BookOpen,
  },
  {
    id: 'input',
    title: 'Ввод ответа',
    description: 'Напишите ответ самостоятельно',
    icon: PenTool,
  },
  {
    id: 'exam',
    title: 'Экзамен',
    description: 'Симуляция теста с таймером',
    icon: GraduationCap,
  },
];

export default function Learn() {
  const { user, isLoading } = useAuth();

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
            Выберите тему
          </h1>
          <p className="mt-2 text-muted-foreground">
            Начните изучение с интересующей вас темы
          </p>
        </div>

        {/* Topics */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
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
                        className="w-full justify-start gap-2 text-xs"
                      >
                        <mode.icon className="h-3 w-3" />
                        {mode.title}
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
            Или пройдите экзамен
          </h2>
          <Card className="gradient-greek text-primary-foreground">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-2xl text-primary-foreground">
                    Симуляция экзамена
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/80 mt-2">
                    Проверьте свои знания в условиях, приближённых к реальному тесту
                  </CardDescription>
                </div>
                <GraduationCap className="h-16 w-16 opacity-50" />
              </div>
            </CardHeader>
            <CardContent>
              <Link to="/learn/exam">
                <Button variant="secondary" size="lg" className="gap-2">
                  Начать экзамен
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
