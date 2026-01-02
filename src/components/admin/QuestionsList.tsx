import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionsListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  topicLabel: string;
}

export function QuestionsList({ questions, onEdit, onDelete, topicLabel }: QuestionsListProps) {
  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Пока нет вопросов по теме "{topicLabel}".
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Нажмите "Добавить вопрос", чтобы создать первый.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Всего вопросов: {questions.length}
      </p>
      
      {questions.map((question) => (
        <Card key={question.id} className="card-hover">
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <p className="font-medium">{question.question}</p>
                
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 dark:text-green-400">
                      {question.correct_answer}
                    </span>
                  </div>
                  
                  {question.wrong_answers.map((answer, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-destructive/60" />
                      <span className="text-muted-foreground">{answer}</span>
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    💡 {question.explanation}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEdit(question)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить вопрос?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие нельзя отменить. Вопрос будет удалён навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(question.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
