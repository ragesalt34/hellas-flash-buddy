import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, User } from 'lucide-react';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Σφάλμα',
        description: language === 'ru' ? 'Никнейм должен содержать минимум 3 символа' : 'Το ψευδώνυμο πρέπει να έχει τουλάχιστον 3 χαρακτήρες',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Σφάλμα',
        description: language === 'ru' ? 'Пароли не совпадают' : 'Οι κωδικοί δεν ταιριάζουν',
        variant: 'destructive',
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: language === 'ru' ? 'Ошибка' : 'Σφάλμα',
        description: language === 'ru' ? 'Пароль должен содержать минимум 6 символов' : 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(username, password);
    if (error) {
      const msg = error.message.includes('already registered')
        ? (language === 'ru' ? 'Этот никнейм уже занят' : 'Αυτό το ψευδώνυμο χρησιμοποιείται ήδη')
        : error.message;
      toast({
        title: language === 'ru' ? 'Ошибка регистрации' : 'Σφάλμα εγγραφής',
        description: msg,
        variant: 'destructive',
      });
      setIsLoading(false);
    } else {
      toast({
        title: language === 'ru' ? 'Регистрация успешна!' : 'Επιτυχής εγγραφή!',
        description: language === 'ru' ? 'Добро пожаловать в систему' : 'Καλώς ήρθατε στο σύστημα',
      });
      navigate('/learn');
    }
  };

  return (
    <Layout>
      <div className="relative container flex items-center justify-center min-h-[calc(100vh-8rem)] py-12 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-[450px] h-[450px] rounded-full aurora-blob" />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full aurora-blob" style={{ animationDelay: '3s' }} />

        <Card className="relative w-full max-w-md liquid-glass-card-v2 border-0 animate-scale-in rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-13 h-13 rounded-xl gradient-greek flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
              <span className="text-2xl font-bold text-primary-foreground">Ελ</span>
            </div>
            <CardTitle className="font-display text-2xl">
              {language === 'ru' ? 'Создать аккаунт' : 'Δημιουργία λογαριασμού'}
            </CardTitle>
            <CardDescription>
              {language === 'ru' ? 'Придумайте никнейм и пароль' : 'Επιλέξτε ψευδώνυμο και κωδικό'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{language === 'ru' ? 'Никнейм' : 'Ψευδώνυμο'}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="username" type="text"
                    placeholder={language === 'ru' ? 'Ваш никнейм' : 'Το ψευδώνυμό σας'}
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/12 input-glow rounded-xl" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{language === 'ru' ? 'Пароль' : 'Κωδικός'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password"
                    placeholder={language === 'ru' ? 'Минимум 6 символов' : 'Τουλάχιστον 6 χαρακτήρες'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/12 input-glow rounded-xl" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{language === 'ru' ? 'Подтвердите пароль' : 'Επανάληψη κωδικού'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type="password"
                    placeholder={language === 'ru' ? 'Повторите пароль' : 'Επαναλάβετε τον κωδικό'}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 liquid-glass-button border-primary/12 input-glow rounded-xl" required />
                </div>
              </div>
              <Button type="submit"
                className="w-full gradient-greek text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all duration-500 spring-transition rounded-xl"
                disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{language === 'ru' ? 'Регистрация...' : 'Εγγραφή...'}</>
                  : (language === 'ru' ? 'Зарегистрироваться' : 'Εγγραφή')}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {language === 'ru' ? 'Уже есть аккаунт?' : 'Έχετε ήδη λογαριασμό;'}{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {language === 'ru' ? 'Войти' : 'Σύνδεση'}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
