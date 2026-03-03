import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Layout } from '@/components/layout/Layout';
import { QuestionsManager } from '@/components/admin/QuestionsManager';
import { KnowledgeBaseManager } from '@/components/admin/KnowledgeBaseManager';
import { Loader2, ShieldAlert, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

export default function Admin() {
  const { user, isAdmin, isLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!isAdmin) return;
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('topic, question, correct_answer, wrong_answers, explanation')
        .order('topic')
        .order('question');
      if (error || !data) throw error;

      const header = ['Тема', 'Вопрос', 'Правильный ответ', 'Неверный 1', 'Неверный 2', 'Неверный 3', 'Объяснение'];
      const rows = data.map(q => {
        const w = Array.isArray(q.wrong_answers) ? q.wrong_answers : [];
        return [q.topic, q.question, q.correct_answer, w[0] ?? '', w[1] ?? '', w[2] ?? '', q.explanation ?? ''];
      });

      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\r\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hellas_questions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">
              {language === 'ru' ? 'Админ-панель' : 'Πίνακας διαχείρισης'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {language === 'ru' ? 'Управление вопросами и базой знаний' : 'Διαχείριση ερωτήσεων και βάσης γνώσεων'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {exporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {language === 'ru' ? 'Выгрузить все вопросы' : 'Εξαγωγή ερωτήσεων'}
          </button>
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