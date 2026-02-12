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
      toast({ title: 'Ошибка входа', description: 'Неверный email или пароль', variant: 'destructive' });
    } else {
      toast({ title: 'Добро пожаловать!', description: 'Вы успешно вошли в систему' });
      navigate('/learn');
    }
    setIsLoading(false);
  };

  return (
    <Layout>
      <div className="relative container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 overflow-hidden">
        {/* Aurora blobs */}
        <div className="absolute -top-24 -left-24 w-[450px] h-[450px] rounded-full aurora-blob" />
        <div className="absolute -bottom-32 -right-32 w-[350px] h-[350px] rounded-full aurora-blob" style={{ animationDelay: '3s' }} />

        <Card className="relative w-full max-w-md liquid-glass-card border-0 animate-scale-in rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-13 h-13 rounded-xl gradient-greek flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
              <span className="text-2xl font-bold text-primary-foreground">Ελ</span>
            </div>
            <CardTitle className="font-display text-2xl">Вход в аккаунт</CardTitle>
            <CardDescription>Введите свои данные для входа</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email" type="email" placeholder="example@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/12 input-glow rounded-xl" required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password" type="password" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/12 input-glow rounded-xl" required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full gradient-greek text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-500 spring-transition rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Вход...</>) : 'Войти'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">Зарегистрироваться</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
