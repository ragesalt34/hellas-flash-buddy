import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionForm } from './QuestionForm';
import { QuestionsList } from './QuestionsList';
import { DocumentUpload } from './DocumentUpload';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Database } from '@/integrations/supabase/types';

type QuestionTopic = Database['public']['Enums']['question_topic'];
type Question = Database['public']['Tables']['questions']['Row'];

export type VerificationResult = {
  questionId: string;
  isCorrect: boolean;
  comment: string;
};

export function QuestionsManager() {
  const { language } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<QuestionTopic>('history');
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [isFixing, setIsFixing] = useState(false);
  const queryClient = useQueryClient();

  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin-questions', selectedTopic],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('topic', selectedTopic)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      toast.success(language === 'ru' ? 'Вопрос удалён' : 'Η ερώτηση διαγράφηκε');
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка при удалении вопроса' : 'Σφάλμα διαγραφής ερώτησης');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (questionsToVerify: Question[]) => {
      const { data, error } = await supabase.functions.invoke('verify-answers', {
        body: { 
          questions: questionsToVerify.map(q => ({
            id: q.id,
            question: q.question,
            correct_answer: q.correct_answer,
            wrong_answers: q.wrong_answers
          }))
        }
      });
      
      if (error) throw error;
      return data as { results: VerificationResult[] };
    },
    onSuccess: (data) => {
      setVerificationResults(data.results);
      const incorrectCount = data.results.filter(r => !r.isCorrect).length;
      if (incorrectCount > 0) {
        toast.warning(language === 'ru' ? `Найдено ${incorrectCount} потенциальных ошибок` : `Βρέθηκαν ${incorrectCount} πιθανά σφάλματα`);
      } else {
        toast.success(language === 'ru' ? 'Все ответы проверены — ошибок не найдено!' : 'Όλες οι απαντήσεις ελέγχθηκαν — δεν βρέθηκαν σφάλματα!');
      }
    },
    onError: (error) => {
      console.error('Verification error:', error);
      toast.error(language === 'ru' ? 'Ошибка при проверке ответов' : 'Σφάλμα ελέγχου απαντήσεων');
    }
  });

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingQuestion(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    setVerificationResults([]); // Clear verification on changes
  };

  const handleVerify = () => {
    if (questions && questions.length > 0) {
      verifyMutation.mutate(questions);
    }
  };

  const handleFixAll = async () => {
    if (!questions) return;
    
    // Get questions with errors
    const incorrectQuestionIds = verificationResults
      .filter(r => !r.isCorrect)
      .map(r => r.questionId);
    
    const questionsToFix = questions.filter(q => incorrectQuestionIds.includes(q.id));
    
    if (questionsToFix.length === 0) {
      toast.info(language === 'ru' ? 'Нет вопросов для исправления' : 'Δεν υπάρχουν ερωτήσεις για διόρθωση');
      return;
    }

    setIsFixing(true);
    
    try {
      // Call AI to fix each question
      const { data, error } = await supabase.functions.invoke('verify-answers', {
        body: { 
          questions: questionsToFix.map(q => ({
            id: q.id,
            question: q.question,
            correct_answer: q.correct_answer,
            wrong_answers: q.wrong_answers
          })),
          mode: 'fix' // Tell the function to fix, not just verify
        }
      });

      if (error) throw error;

      // Validate response shape before iterating
      const fixes = Array.isArray(data?.fixes) ? data.fixes as Array<{
        questionId: string;
        correct_answer: string;
        explanation?: string;
      }> : [];

      if (fixes.length === 0) {
        toast.info(language === 'ru' ? 'AI не вернул исправлений' : 'Το AI δεν επέστρεψε διορθώσεις');
        return;
      }

      let fixedCount = 0;
      for (const fix of fixes) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ 
            correct_answer: fix.correct_answer,
            explanation: fix.explanation 
          })
          .eq('id', fix.questionId);
        
        if (!updateError) fixedCount++;
      }

      // Refresh questions and clear verification
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
      setVerificationResults([]);
      
      toast.success(language === 'ru' ? `Исправлено ${fixedCount} вопросов` : `Διορθώθηκαν ${fixedCount} ερωτήσεις`);
    } catch (error) {
      console.error('Fix error:', error);
      toast.error(language === 'ru' ? 'Ошибка при исправлении вопросов' : 'Σφάλμα διόρθωσης ερωτήσεων');
    } finally {
      setIsFixing(false);
    }
  };

  const topicLabels: Record<QuestionTopic, string> = {
    history: language === 'ru' ? 'История' : 'Ιστορία',
    culture: language === 'ru' ? 'Культура' : 'Πολιτισμός',
    laws: language === 'ru' ? 'Законы' : 'Νόμοι',
    geography: language === 'ru' ? 'География' : 'Γεωγραφία',
  };

  // Clear verification results when topic changes
  const handleTopicChange = (topic: QuestionTopic) => {
    setSelectedTopic(topic);
    setVerificationResults([]);
  };

  return (
    <div className="space-y-8">
      {/* AI Document Upload */}
      <DocumentUpload />

      {/* Manual Questions Management */}
      <div className="flex items-center justify-between">
        <Tabs value={selectedTopic} onValueChange={(v) => handleTopicChange(v as QuestionTopic)}>
          <TabsList>
            <TabsTrigger value="history" className="gap-2">
              🏛️ {language === 'ru' ? 'История' : 'Ιστορία'}
            </TabsTrigger>
            <TabsTrigger value="culture" className="gap-2">
              🎭 {language === 'ru' ? 'Культура' : 'Πολιτισμός'}
            </TabsTrigger>
            <TabsTrigger value="laws" className="gap-2">
              ⚖️ {language === 'ru' ? 'Законы' : 'Νόμοι'}
            </TabsTrigger>
            <TabsTrigger value="geography" className="gap-2">
              🗺️ {language === 'ru' ? 'География' : 'Γεωγραφία'}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {language === 'ru' ? 'Добавить вопрос' : 'Προσθήκη ερώτησης'}
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion
                ? (language === 'ru' ? 'Редактировать вопрос' : 'Επεξεργασία ερώτησης')
                : (language === 'ru' ? 'Новый вопрос' : 'Νέα ερώτηση')}
            </DialogTitle>
          </DialogHeader>
          <QuestionForm
            question={editingQuestion}
            defaultTopic={selectedTopic}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <QuestionsList
          questions={questions || []}
          onEdit={handleEdit}
          onDelete={(id) => deleteMutation.mutate(id)}
          topicLabel={topicLabels[selectedTopic]}
          verificationResults={verificationResults}
          isVerifying={verifyMutation.isPending}
          onVerify={handleVerify}
          onFixAll={handleFixAll}
          isFixing={isFixing}
        />
      )}
    </div>
  );
}
