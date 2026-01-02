import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type QuestionTopic = Database['public']['Enums']['question_topic'];
type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionFormProps {
  question?: Question | null;
  defaultTopic: QuestionTopic;
  onSuccess: () => void;
  onCancel: () => void;
}

export function QuestionForm({ question, defaultTopic, onSuccess, onCancel }: QuestionFormProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState<QuestionTopic>(question?.topic || defaultTopic);
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [wrongAnswers, setWrongAnswers] = useState<string[]>(
    question?.wrong_answers || ['', '', '']
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');

  const mutation = useMutation({
    mutationFn: async () => {
      const filteredWrongAnswers = wrongAnswers.filter(a => a.trim() !== '');
      
      if (!questionText.trim()) throw new Error('Введите вопрос');
      if (!correctAnswer.trim()) throw new Error('Введите правильный ответ');
      if (filteredWrongAnswers.length < 1) throw new Error('Добавьте хотя бы один неправильный ответ');

      const data = {
        topic,
        question: questionText.trim(),
        correct_answer: correctAnswer.trim(),
        wrong_answers: filteredWrongAnswers,
        explanation: explanation.trim() || null,
        created_by: user?.id || null
      };

      if (question) {
        const { error } = await supabase
          .from('questions')
          .update(data)
          .eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('questions')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(question ? 'Вопрос обновлён' : 'Вопрос добавлен');
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const addWrongAnswer = () => {
    setWrongAnswers([...wrongAnswers, '']);
  };

  const removeWrongAnswer = (index: number) => {
    setWrongAnswers(wrongAnswers.filter((_, i) => i !== index));
  };

  const updateWrongAnswer = (index: number, value: string) => {
    const updated = [...wrongAnswers];
    updated[index] = value;
    setWrongAnswers(updated);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Тема</Label>
          <Select value={topic} onValueChange={(v) => setTopic(v as QuestionTopic)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="history">🏛️ История</SelectItem>
              <SelectItem value="culture">🎭 Культура</SelectItem>
              <SelectItem value="laws">⚖️ Законы</SelectItem>
              <SelectItem value="geography">🗺️ География</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Вопрос *</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Введите текст вопроса..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Правильный ответ *</Label>
        <Input
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder="Введите правильный ответ..."
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Неправильные ответы *</Label>
          <Button type="button" variant="outline" size="sm" onClick={addWrongAnswer}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить
          </Button>
        </div>
        
        {wrongAnswers.map((answer, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => updateWrongAnswer(index, e.target.value)}
              placeholder={`Неправильный ответ ${index + 1}`}
            />
            {wrongAnswers.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeWrongAnswer(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Объяснение (опционально)</Label>
        <Textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Добавьте объяснение правильного ответа..."
          rows={2}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {question ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
