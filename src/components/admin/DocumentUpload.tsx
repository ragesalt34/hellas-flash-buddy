import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Database } from '@/integrations/supabase/types';

type QuestionTopic = Database['public']['Enums']['question_topic'];

interface ParsedQuestion {
  question: string;
  correct_answer: string;
  wrong_answers: string[];
  explanation?: string;
}

export function DocumentUpload() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [topic, setTopic] = useState<QuestionTopic>('history');
  const [documentText, setDocumentText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());

  const parseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('parse-questions', {
        body: { documentText, topic },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.questions as ParsedQuestion[];
    },
    onSuccess: (questions) => {
      setParsedQuestions(questions);
      setSelectedQuestions(new Set(questions.map((_, i) => i)));
      toast.success(language === 'ru' ? `Найдено ${questions.length} вопросов` : `Βρέθηκαν ${questions.length} ερωτήσεις`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const questionsToSave = parsedQuestions
        .filter((_, i) => selectedQuestions.has(i))
        .map((q) => ({
          topic,
          question: q.question,
          correct_answer: q.correct_answer,
          wrong_answers: q.wrong_answers,
          explanation: q.explanation || null,
          created_by: user?.id || null,
        }));

      const { error } = await supabase.from('questions').insert(questionsToSave);
      if (error) throw error;
      
      return questionsToSave.length;
    },
    onSuccess: (count) => {
      toast.success(language === 'ru' ? `Добавлено ${count} вопросов` : `Προστέθηκαν ${count} ερωτήσεις`);
      setParsedQuestions([]);
      setSelectedQuestions(new Set());
      setDocumentText('');
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setDocumentText(text);
      toast.success(language === 'ru' ? `Файл "${file.name}" загружен` : `Το αρχείο "${file.name}" φορτώθηκε`);
    } catch {
      toast.error(language === 'ru' ? 'Не удалось прочитать файл' : 'Αδυναμία ανάγνωσης αρχείου');
    }
  };

  const toggleQuestion = (index: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuestions(newSelected);
  };

  const selectAll = () => {
    setSelectedQuestions(new Set(parsedQuestions.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedQuestions(new Set());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          {language === 'ru' ? 'AI-генерация вопросов' : 'AI-δημιουργία ερωτήσεων'}
        </CardTitle>
        <CardDescription>
          {language === 'ru'
            ? 'Загрузите документ или вставьте текст — AI извлечёт вопросы и сгенерирует варианты ответов'
            : 'Ανεβάστε ένα έγγραφο ή επικολλήστε κείμενο — το AI θα εξαγάγει ερωτήσεις και θα δημιουργήσει απαντήσεις'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Topic Selection */}
        <div className="space-y-2">
          <Label>{language === 'ru' ? 'Тема вопросов' : 'Θέμα ερωτήσεων'}</Label>
          <Select value={topic} onValueChange={(v) => setTopic(v as QuestionTopic)}>
            <SelectTrigger className="w-full sm:w-64">
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

        {/* File Upload */}
        <div className="space-y-2">
          <Label>{language === 'ru' ? 'Загрузить файл' : 'Ανέβασμα αρχείου'}</Label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {language === 'ru' ? 'Выбрать файл (.txt, .md)' : 'Επιλογή αρχείου (.txt, .md)'}
            </Button>
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <Label>{language === 'ru' ? 'Или вставьте текст документа' : 'Ή επικολλήστε κείμενο εγγράφου'}</Label>
          <Textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder={language === 'ru' ? 'Вставьте текст с вопросами и ответами...' : 'Επικολλήστε κείμενο με ερωτήσεις και απαντήσεις...'}
            rows={6}
          />
        </div>

        {/* Parse Button */}
        <Button
          onClick={() => parseMutation.mutate()}
          disabled={!documentText.trim() || parseMutation.isPending}
          className="gap-2"
        >
          {parseMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {language === 'ru' ? 'Извлечь вопросы с помощью AI' : 'Εξαγωγή ερωτήσεων με AI'}
        </Button>

        {/* Parsed Questions */}
        {parsedQuestions.length > 0 && (
          <div className="space-y-4 mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {language === 'ru' ? 'Найденные вопросы' : 'Βρεθείσες ερωτήσεις'} ({selectedQuestions.size}/{parsedQuestions.length})
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {language === 'ru' ? 'Выбрать все' : 'Επιλογή όλων'}
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  {language === 'ru' ? 'Снять все' : 'Αποεπιλογή όλων'}
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parsedQuestions.map((q, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    selectedQuestions.has(index)
                      ? 'border-primary bg-primary/5'
                      : 'opacity-60'
                  }`}
                  onClick={() => toggleQuestion(index)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedQuestions.has(index)
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {selectedQuestions.has(index) && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-sm">{q.question}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ {q.correct_answer}
                          </span>
                          {q.wrong_answers.map((wrong, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              ✗ {wrong}
                            </span>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={selectedQuestions.size === 0 || saveMutation.isPending}
              className="w-full gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {language === 'ru' ? `Сохранить ${selectedQuestions.size} вопросов` : `Αποθήκευση ${selectedQuestions.size} ερωτήσεων`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
