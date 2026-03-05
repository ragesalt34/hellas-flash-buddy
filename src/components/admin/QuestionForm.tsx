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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  // RU fields
  const [questionText, setQuestionText] = useState(question?.question || '');
  const [correctAnswer, setCorrectAnswer] = useState(question?.correct_answer || '');
  const [wrongAnswers, setWrongAnswers] = useState<string[]>(
    question?.wrong_answers || ['', '', '']
  );
  const [explanation, setExplanation] = useState(question?.explanation || '');

  // EL fields
  const [questionElText, setQuestionElText] = useState(question?.question_el || '');
  const [correctAnswerEl, setCorrectAnswerEl] = useState(question?.correct_answer_el || '');
  const [wrongAnswersEl, setWrongAnswersEl] = useState<string[]>(
    question?.wrong_answers_el || ['', '', '']
  );
  const [explanationEl, setExplanationEl] = useState(question?.explanation_el || '');

  useEffect(() => {
    if (question) {
      setTopic(question.topic);
      setQuestionText(question.question);
      setCorrectAnswer(question.correct_answer);
      setWrongAnswers(question.wrong_answers);
      setExplanation(question.explanation || '');
      setQuestionElText(question.question_el || '');
      setCorrectAnswerEl(question.correct_answer_el || '');
      setWrongAnswersEl(question.wrong_answers_el || ['', '', '']);
      setExplanationEl(question.explanation_el || '');
    } else {
      setTopic(defaultTopic);
      setQuestionText('');
      setCorrectAnswer('');
      setWrongAnswers(['', '', '']);
      setExplanation('');
      setQuestionElText('');
      setCorrectAnswerEl('');
      setWrongAnswersEl(['', '', '']);
      setExplanationEl('');
    }
  }, [question, defaultTopic]);

  const mutation = useMutation({
    mutationFn: async () => {
      const filteredWrongAnswers = wrongAnswers.filter(a => a.trim() !== '');
      const filteredWrongAnswersEl = wrongAnswersEl.filter(a => a.trim() !== '');

      if (!questionText.trim()) throw new Error(language === 'ru' ? 'Введите вопрос' : 'Εισάγετε την ερώτηση');
      if (!correctAnswer.trim()) throw new Error(language === 'ru' ? 'Введите правильный ответ' : 'Εισάγετε τη σωστή απάντηση');
      if (filteredWrongAnswers.length < 1) throw new Error(language === 'ru' ? 'Добавьте хотя бы один неправильный ответ' : 'Προσθέστε τουλάχιστον μία λανθασμένη απάντηση');

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
        question_el: questionElText.trim() || null,
        correct_answer_el: correctAnswerEl.trim() || null,
        wrong_answers_el: filteredWrongAnswersEl.length > 0 ? filteredWrongAnswersEl : null,
        explanation_el: explanationEl.trim() || null,
        created_by: user?.id || null,
      };

      if (question) {
        const { error } = await supabase.from('questions').update(data).eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(language === 'ru'
        ? (question ? 'Вопрос обновлён' : 'Вопрос добавлен')
        : (question ? 'Η ερώτηση ενημερώθηκε' : 'Η ερώτηση προστέθηκε'));
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // RU wrong answer helpers
  const addWrongAnswer = () => setWrongAnswers([...wrongAnswers, '']);
  const removeWrongAnswer = (i: number) => setWrongAnswers(wrongAnswers.filter((_, idx) => idx !== i));
  const updateWrongAnswer = (i: number, v: string) => {
    const u = [...wrongAnswers]; u[i] = v; setWrongAnswers(u);
  };

  // EL wrong answer helpers
  const addWrongAnswerEl = () => setWrongAnswersEl([...wrongAnswersEl, '']);
  const removeWrongAnswerEl = (i: number) => setWrongAnswersEl(wrongAnswersEl.filter((_, idx) => idx !== i));
  const updateWrongAnswerEl = (i: number, v: string) => {
    const u = [...wrongAnswersEl]; u[i] = v; setWrongAnswersEl(u);
  };

  const hasElTranslation = !!(questionElText.trim() && correctAnswerEl.trim());

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!mutation.isPending) mutation.mutate(); }} className="space-y-5">
      {/* Topic selector */}
      <div className="space-y-2">
        <Label>{language === 'ru' ? 'Тема' : 'Θέμα'}</Label>
        <Select value={topic} onValueChange={(v) => setTopic(v as QuestionTopic)}>
          <SelectTrigger className="w-[220px]">
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

      {/* Language tabs */}
      <Tabs defaultValue="ru">
        <TabsList>
          <TabsTrigger value="ru">🇷🇺 Русский</TabsTrigger>
          <TabsTrigger value="el" className="gap-1.5">
            🇬🇷 Ελληνικά
            {hasElTranslation
              ? <span className="text-[10px] bg-green-500/20 text-green-700 rounded px-1">✓</span>
              : <span className="text-[10px] bg-yellow-500/20 text-yellow-700 rounded px-1">{language === 'ru' ? 'нет' : 'χωρίς'}</span>}
          </TabsTrigger>
        </TabsList>

        {/* === RU TAB === */}
        <TabsContent value="ru" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{language === 'ru' ? 'Вопрос *' : 'Ερώτηση *'}</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder={language === 'ru' ? 'Введите текст вопроса...' : 'Εισάγετε το κείμενο...'}
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
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeWrongAnswer(index)}>
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
              placeholder={language === 'ru' ? 'Добавьте объяснение...' : 'Προσθέστε επεξήγηση...'}
              rows={2}
            />
          </div>
        </TabsContent>

        {/* === EL TAB === */}
        <TabsContent value="el" className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            {language === 'ru'
              ? 'Показывается пользователям при выборе языка Ελληνικά. Оставьте пустым для использования русского текста.'
              : 'Εμφανίζεται στους χρήστες όταν επιλέγουν ελληνική γλώσσα. Αφήστε κενό για χρήση ρωσικού κειμένου.'}
          </p>

          <div className="space-y-2">
            <Label>Ερώτηση {language === 'ru' ? '(греч.)' : ''}</Label>
            <Textarea
              value={questionElText}
              onChange={(e) => setQuestionElText(e.target.value)}
              placeholder="Εισάγετε την ελληνική ερώτηση..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Σωστή απάντηση {language === 'ru' ? '(греч.)' : ''}</Label>
            <Input
              value={correctAnswerEl}
              onChange={(e) => setCorrectAnswerEl(e.target.value)}
              placeholder="Εισάγετε τη σωστή ελληνική απάντηση..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Λανθασμένες απαντήσεις {language === 'ru' ? '(греч.)' : ''}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addWrongAnswerEl}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ru' ? 'Добавить' : 'Προσθήκη'}
              </Button>
            </div>
            {wrongAnswersEl.map((answer, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={answer}
                  onChange={(e) => updateWrongAnswerEl(index, e.target.value)}
                  placeholder={`Λανθασμένη απάντηση ${index + 1}`}
                />
                {wrongAnswersEl.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeWrongAnswerEl(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Επεξήγηση {language === 'ru' ? '(греч., опционально)' : '(προαιρετικό)'}</Label>
            <Textarea
              value={explanationEl}
              onChange={(e) => setExplanationEl(e.target.value)}
              placeholder="Προσθέστε ελληνική επεξήγηση..."
              rows={2}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 justify-end border-t pt-4">
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
