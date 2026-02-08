import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Ошибка входа',
        description: 'Неверный email или пароль',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Добро пожаловать!',
        description: 'Вы успешно вошли в систему',
      });
      navigate('/learn');
    }

    setIsLoading(false);
  };

  return (
    <Layout>
      <div className="relative container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 overflow-hidden">
        {/* Floating decorative elements */}
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full floating-orb-glass" />
        <div className="absolute -bottom-32 -right-32 w-[300px] h-[300px] rounded-full floating-orb-glass" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 right-10 w-16 h-16 liquid-glass rounded-2xl rotate-12 opacity-40 animate-float" />
        <div className="absolute bottom-1/4 left-10 w-12 h-12 liquid-glass rounded-full opacity-30 animate-float-slow" />

        <Card className="relative w-full max-w-md liquid-glass-card glow-border animate-scale-in">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl gradient-greek flex items-center justify-center mb-4 shadow-xl shadow-primary/30">
              <span className="text-2xl font-bold text-primary-foreground">Ελ</span>
            </div>
            <CardTitle className="font-display text-2xl">Вход в аккаунт</CardTitle>
            <CardDescription>
              Введите свои данные для входа
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/20 focus:border-primary/40"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/20 focus:border-primary/40"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-greek text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Зарегистрироваться
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
