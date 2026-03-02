import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { QuestionsManager } from '@/components/admin/QuestionsManager';
import { KnowledgeBaseManager } from '@/components/admin/KnowledgeBaseManager';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Admin() {
  const { user, isAdmin, isLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <ShieldAlert className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="font-display text-3xl font-bold mb-2">
            {language === 'ru' ? 'Доступ запрещён' : 'Δεν επιτρέπεται η πρόσβαση'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ru'
              ? 'У вас нет прав для доступа к админ-панели.'
              : 'Δεν έχετε δικαιώματα πρόσβασης στον πίνακα διαχείρισης.'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            {language === 'ru' ? 'Админ-панель' : 'Πίνακας διαχείρισης'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {language === 'ru' ? 'Управление вопросами и базой знаний' : 'Διαχείριση ερωτήσεων και βάσης γνώσεων'}
          </p>
        </div>
        
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">{language === 'ru' ? 'Вопросы' : 'Ερωτήσεις'}</TabsTrigger>
            <TabsTrigger value="knowledge">{language === 'ru' ? 'База знаний' : 'Βάση γνώσεων'}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="questions">
            <QuestionsManager />
          </TabsContent>
          
          <TabsContent value="knowledge">
            <KnowledgeBaseManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}