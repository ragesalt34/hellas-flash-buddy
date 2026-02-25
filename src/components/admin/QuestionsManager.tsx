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
import type { Database } from '@/integrations/supabase/types';

type QuestionTopic = Database['public']['Enums']['question_topic'];
type Question = Database['public']['Tables']['questions']['Row'];

export type VerificationResult = {
  questionId: string;
  isCorrect: boolean;
  comment: string;
};

export function QuestionsManager() {
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
      toast.success('Вопрос удалён');
    },
    onError: () => {
      toast.error('Ошибка при удалении вопроса');
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
        toast.warning(`Найдено ${incorrectCount} потенциальных ошибок`);
      } else {
        toast.success('Все ответы проверены — ошибок не найдено!');
      }
    },
    onError: (error) => {
      console.error('Verification error:', error);
      toast.error('Ошибка при проверке ответов');
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
      toast.info('Нет вопросов для исправления');
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

      // Update each question in the database
      const fixes = data.fixes as Array<{
        questionId: string;
        correct_answer: string;
        explanation?: string;
      }>;

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
      
      toast.success(`Исправлено ${fixedCount} вопросов`);
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Ошибка при исправлении вопросов');
    } finally {
      setIsFixing(false);
    }
  };

  const topicLabels: Record<QuestionTopic, string> = {
    history: 'История',
    culture: 'Культура',
    laws: 'Законы',
    geography: 'География'
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
              🏛️ История
            </TabsTrigger>
            <TabsTrigger value="culture" className="gap-2">
              🎭 Культура
            </TabsTrigger>
            <TabsTrigger value="laws" className="gap-2">
              ⚖️ Законы
            </TabsTrigger>
            <TabsTrigger value="geography" className="gap-2">
              🗺️ География
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добавить вопрос
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleFormClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Редактировать вопрос' : 'Новый вопрос'}
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
