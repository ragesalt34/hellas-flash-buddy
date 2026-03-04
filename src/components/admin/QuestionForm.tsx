import { useState, useEffect } from 'react';
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
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { language } = useLanguage();
  const [topic, setTopic] = useState<QuestionTopic>(question?.topic || defaultTopic);
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [wrongAnswers, setWrongAnswers] = useState<string[]>(
    question?.wrong_answers || ['', '', '']
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');

  // Синхронизация полей формы при изменении редактируемого вопроса
  useEffect(() => {
    if (question) {
      setTopic(question.topic);
      setQuestionText(question.question);
      setCorrectAnswer(question.correct_answer);
      setWrongAnswers(question.wrong_answers);
      setExplanation(question.explanation || '');
    } else {
      setTopic(defaultTopic);
      setQuestionText('');
      setCorrectAnswer('');
      setWrongAnswers(['', '', '']);
      setExplanation('');
    }
  }, [question, defaultTopic]);

  const mutation = useMutation({
    mutationFn: async () => {
      const filteredWrongAnswers = wrongAnswers.filter(a => a.trim() !== '');
      
      if (!questionText.trim()) throw new Error(language === 'ru' ? 'Введите вопрос' : 'Εισάγετε την ερώτηση');
      if (!correctAnswer.trim()) throw new Error(language === 'ru' ? 'Введите правильный ответ' : 'Εισάγετε τη σωστή απάντηση');
      if (filteredWrongAnswers.length < 1) throw new Error(language === 'ru' ? 'Добавьте хотя бы один неправильный ответ' : 'Προσθέστε τουλάχιστον μία λανθασμένη απάντηση');

      // Prevent correct answer from being identical to a wrong answer
      const correctNorm = correctAnswer.trim().toLowerCase();
      if (filteredWrongAnswers.some(a => a.trim().toLowerCase() === correctNorm)) {
        throw new Error(language === 'ru' ? 'Правильный ответ совпадает с одним из неправильных' : 'Η σωστή απάντηση ταυτίζεται με μία λανθασμένη');
      }

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
      toast.success(language === 'ru' ? (question ? 'Вопрос обновлён' : 'Вопрос добавлен') : (question ? 'Η ερώτηση ενημερώθηκε' : 'Η ερώτηση προστέθηκε'));
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
          <Label>{language === 'ru' ? 'Тема' : 'Θέμα'}</Label>
          <Select value={topic} onValueChange={(v) => setTopic(v as QuestionTopic)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="history">🏛️ {language === 'ru' ? 'История' : 'Ιστορία'}</SelectItem>
              <SelectItem value="culture">🎭 {language === 'ru' ? 'Культура' : 'Πολιτισμός'}</SelectItem>
              <SelectItem value="laws">⚖️ {language === 'ru' ? 'Законы' : 'Νόμοι'}</SelectItem>
              <SelectItem value="geography">🗺️ {language === 'ru' ? 'География' : 'Γεωγραφία'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{language === 'ru' ? 'Вопрос *' : 'Ερώτηση *'}</Label>
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={language === 'ru' ? 'Введите текст вопроса...' : 'Εισάγετε το κείμενο της ερώτησης...'}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{language === 'ru' ? 'Правильный ответ *' : 'Σωστή απάντηση *'}</Label>
        <Input
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          placeholder={language === 'ru' ? 'Введите правильный ответ...' : 'Εισάγετε τη σωστή απάντηση...'}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{language === 'ru' ? 'Неправильные ответы *' : 'Λανθασμένες απαντήσεις *'}</Label>
          <Button type="button" variant="outline" size="sm" onClick={addWrongAnswer}>
            <Plus className="h-4 w-4 mr-1" />
            {language === 'ru' ? 'Добавить' : 'Προσθήκη'}
          </Button>
        </div>

        {wrongAnswers.map((answer, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => updateWrongAnswer(index, e.target.value)}
              placeholder={language === 'ru' ? `Неправильный ответ ${index + 1}` : `Λανθασμένη απάντηση ${index + 1}`}
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
        <Label>{language === 'ru' ? 'Объяснение (опционально)' : 'Επεξήγηση (προαιρετικό)'}</Label>
        <Textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder={language === 'ru' ? 'Добавьте объяснение правильного ответа...' : 'Προσθέστε επεξήγηση της σωστής απάντησης...'}
          rows={2}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {language === 'ru' ? 'Отмена' : 'Ακύρωση'}
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {language === 'ru' ? (question ? 'Сохранить' : 'Добавить') : (question ? 'Αποθήκευση' : 'Προσθήκη')}
        </Button>
      </div>
    </form>
  );
}
