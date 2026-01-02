import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionForm } from './QuestionForm';
import { QuestionsList } from './QuestionsList';
import { DocumentUpload } from './DocumentUpload';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type QuestionTopic = Database['public']['Enums']['question_topic'];
type Question = Database['public']['Tables']['questions']['Row'];

export function QuestionsManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<QuestionTopic>('history');
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
  };

  const topicLabels: Record<QuestionTopic, string> = {
    history: 'История',
    culture: 'Культура',
    laws: 'Законы',
    geography: 'География'
  };

  return (
    <div className="space-y-8">
      {/* AI Document Upload */}
      <DocumentUpload />

      {/* Manual Questions Management */}
      <div className="flex items-center justify-between">
        <Tabs value={selectedTopic} onValueChange={(v) => setSelectedTopic(v as QuestionTopic)}>
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

      {isFormOpen && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingQuestion ? 'Редактировать вопрос' : 'Новый вопрос'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionForm
              question={editingQuestion}
              defaultTopic={selectedTopic}
              onSuccess={handleFormSuccess}
              onCancel={handleFormClose}
            />
          </CardContent>
        </Card>
      )}

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
        />
      )}
    </div>
  );
}
