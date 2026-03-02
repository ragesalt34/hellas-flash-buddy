import { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Camera, User, Lock, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileData = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export default function Profile() {
  const { user, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);

  const nameTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const passwordTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    return () => {
      clearTimeout(nameTimerRef.current);
      clearTimeout(passwordTimerRef.current);
    };
  }, []);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      const typed = data as unknown as ProfileData;
      if (typed) setDisplayName(typed.display_name || '');
      return typed;
    },
    enabled: !!user,
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: name, updated_at: new Date().toISOString() })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setNameSuccess(true);
      setNameError('');
      clearTimeout(nameTimerRef.current);
      nameTimerRef.current = setTimeout(() => setNameSuccess(false), 3000);
    },
    onError: () => {
      setNameError(language === 'ru' ? 'Ошибка при сохранении' : 'Σφάλμα αποθήκευσης');
    },
  });

  const handleSaveName = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    updateNameMutation.mutate(trimmed);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError(language === 'ru' ? 'Минимум 6 символов' : 'Τουλάχιστον 6 χαρακτήρες');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(language === 'ru' ? 'Пароли не совпадают' : 'Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(language === 'ru' ? 'Ошибка при смене пароля' : 'Σφάλμα αλλαγής κωδικού');
    } else {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = setTimeout(() => setPasswordSuccess(false), 3000);
    }
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const uid = user!.id;
      const { error } = await supabase.rpc('reset_user_progress', { p_user_id: uid });
      if (error) throw error;
      Object.keys(localStorage)
        .filter(k => k.startsWith(`streak_milestone_${uid}_`))
        .forEach(k => localStorage.removeItem(k));
    },
    onSuccess: () => {
      queryClient.clear();
      navigate('/stats');
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка при сбросе прогресса' : 'Σφάλμα επαναφοράς προόδου');
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() } as never)
        .eq('id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    } catch {
      toast.error(language === 'ru' ? 'Ошибка загрузки фото' : 'Σφάλμα μεταφόρτωσης φωτογραφίας');
    } finally {
      setAvatarUploading(false);
    }
  };

  if (authLoading || (user && profileLoading)) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || user.email || '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Layout>
      <div className="relative container py-8 sm:py-12 overflow-hidden max-w-2xl">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full aurora-blob" />

        <div className="relative mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {language === 'ru' ? 'Профиль' : 'Προφίλ'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {language === 'ru' ? 'Настройки аккаунта' : 'Ρυθμίσεις λογαριασμού'}
          </p>
        </div>

        <div className="relative space-y-6">

          {/* Avatar + name header */}
          <Card className="liquid-glass-card animate-fade-in">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden liquid-glass-button flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{initials}</span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
                >
                  {avatarUploading
                    ? <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                    : <Camera className="h-4 w-4 text-primary-foreground" />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              <div>
                <p className="font-display text-xl font-semibold">
                  {profile?.display_name || '—'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display name */}
          <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {language === 'ru' ? 'Никнейм' : 'Ψευδώνυμο'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Отображаемое имя в приложении' : 'Εμφανιζόμενο όνομα στην εφαρμογή'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  {language === 'ru' ? 'Имя' : 'Όνομα'}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder={language === 'ru' ? 'Ваш никнейм' : 'Το ψευδώνυμό σας'}
                  className="liquid-glass"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
              </div>

              {nameError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {nameError}
                </div>
              )}
              {nameSuccess && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <Check className="h-4 w-4" />
                  {language === 'ru' ? 'Сохранено!' : 'Αποθηκεύτηκε!'}
                </div>
              )}

              <Button
                onClick={handleSaveName}
                disabled={updateNameMutation.isPending || !displayName.trim()}
                className="liquid-glass-button"
                variant="outline"
              >
                {updateNameMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === 'ru' ? 'Сохранить' : 'Αποθήκευση'}
              </Button>
            </CardContent>
          </Card>

          {/* Password */}
          <Card className="liquid-glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg liquid-glass-button">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                {language === 'ru' ? 'Пароль' : 'Κωδικός'}
              </CardTitle>
              <CardDescription>
                {language === 'ru' ? 'Смените пароль от аккаунта' : 'Αλλάξτε τον κωδικό σας'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {language === 'ru' ? 'Новый пароль' : 'Νέος κωδικός'}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="liquid-glass"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {language === 'ru' ? 'Повторите пароль' : 'Επανάληψη κωδικού'}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="liquid-glass"
                  onKeyDown={e => e.key === 'Enter' && handlePasswordChange()}
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-success text-sm">
                  <Check className="h-4 w-4" />
                  {language === 'ru' ? 'Пароль изменён!' : 'Ο κωδικός άλλαξε!'}
                </div>
              )}

              <Button
                onClick={handlePasswordChange}
                disabled={!newPassword || !confirmPassword}
                className="liquid-glass-button"
                variant="outline"
              >
                {language === 'ru' ? 'Изменить пароль' : 'Αλλαγή κωδικού'}
              </Button>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="liquid-glass-card animate-fade-in border-destructive/30" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <RotateCcw className="h-4 w-4 text-destructive" />
                </div>
                {language === 'ru' ? 'Сбросить прогресс' : 'Επαναφορά προόδου'}
              </CardTitle>
              <CardDescription>
                {language === 'ru'
                  ? 'Удалит всю историю ответов, результаты экзаменов и сессии обучения. Начнёте с нуля.'
                  : 'Διαγράφει όλο το ιστορικό απαντήσεων, αποτελέσματα εξετάσεων και συνεδρίες μελέτης.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={resetMutation.isPending}>
                    {resetMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RotateCcw className="h-4 w-4" />}
                    {language === 'ru' ? 'Сбросить весь прогресс' : 'Επαναφορά όλης της προόδου'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {language === 'ru' ? 'Вы уверены?' : 'Είστε σίγουροι;'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === 'ru'
                        ? 'Это действие необратимо. Весь прогресс обучения, результаты экзаменов и история сессий будут удалены навсегда.'
                        : 'Αυτή η ενέργεια είναι μη αναστρέψιμη. Όλη η πρόοδος μελέτης, τα αποτελέσματα εξετάσεων και το ιστορικό συνεδριών θα διαγραφούν οριστικά.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {language === 'ru' ? 'Отмена' : 'Ακύρωση'}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => resetMutation.mutate()}
                    >
                      {language === 'ru' ? 'Сбросить' : 'Επαναφορά'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {resetMutation.isSuccess && (
                <p className="mt-3 text-sm text-success flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {language === 'ru' ? 'Прогресс сброшен!' : 'Η πρόοδος επαναφέρθηκε!'}
                </p>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </Layout>
  );
}
