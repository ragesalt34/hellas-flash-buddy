import { useState } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pencil, Trash2, CheckCircle2, XCircle, AlertTriangle, CheckCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Database } from '@/integrations/supabase/types';
import type { VerificationResult } from './QuestionsManager';
import { VerificationPanel } from './VerificationPanel';

type Question = Database['public']['Tables']['questions']['Row'];

interface QuestionsListProps {
  questions: Question[];
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
  topicLabel: string;
  verificationResults?: VerificationResult[];
  isVerifying?: boolean;
  onVerify?: () => void;
  onFixAll?: () => void;
  isFixing?: boolean;
}

export function QuestionsList({
  questions,
  onEdit,
  onDelete,
  topicLabel,
  verificationResults = [],
  isVerifying = false,
  onVerify,
  onFixAll,
  isFixing = false
}: QuestionsListProps) {
  const { language } = useLanguage();
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  
  const getVerificationStatus = (questionId: string) => {
    return verificationResults.find(r => r.questionId === questionId);
  };

  // Calculate stats for verification panel
  const correctCount = verificationResults.filter(r => r.isCorrect).length;
  const incorrectCount = verificationResults.filter(r => !r.isCorrect).length;

  // Filter questions based on error filter
  const displayedQuestions = showOnlyErrors 
    ? questions.filter(q => {
        const result = verificationResults.find(r => r.questionId === q.id);
        return result && !result.isCorrect;
      })
    : questions;

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {language === 'ru' ? `Пока нет вопросов по теме "${topicLabel}".` : `Δεν υπάρχουν ερωτήσεις για το θέμα "${topicLabel}".`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'ru' ? 'Нажмите "Добавить вопрос", чтобы создать первый.' : 'Πατήστε "Προσθήκη ερώτησης" για να δημιουργήσετε την πρώτη.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verification Panel - показываем после проверки */}
      {verificationResults.length > 0 && onVerify ? (
        <VerificationPanel
          totalQuestions={questions.length}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          showOnlyErrors={showOnlyErrors}
          onToggleFilter={() => setShowOnlyErrors(!showOnlyErrors)}
          onVerify={onVerify}
          isVerifying={isVerifying}
          onFixAll={onFixAll}
          isFixing={isFixing}
        />
      ) : onVerify ? (
        <div className="liquid-glass-card rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {language === 'ru' ? `Всего вопросов: ${questions.length}` : `Σύνολο ερωτήσεων: ${questions.length}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onVerify}
            disabled={isVerifying}
            className="gap-2"
          >
            {isVerifying ? (
              <>
                <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {language === 'ru' ? 'Проверка...' : 'Έλεγχος...'}
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                {language === 'ru' ? 'Проверить ответы' : 'Έλεγχος απαντήσεων'}
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {language === 'ru' ? `Всего вопросов: ${questions.length}` : `Σύνολο ερωτήσεων: ${questions.length}`}
        </p>
      )}

      {/* Filter indicator */}
      {showOnlyErrors && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          {language === 'ru'
            ? `Показаны только вопросы с ошибками (${displayedQuestions.length} из ${questions.length})`
            : `Εμφανίζονται μόνο ερωτήσεις με σφάλματα (${displayedQuestions.length} από ${questions.length})`}
        </p>
      )}
      
      <TooltipProvider>
        {displayedQuestions.map((question) => {
          const verification = getVerificationStatus(question.id);
          
          return (
            <Card 
              key={question.id} 
              className={`card-hover ${
                verification 
                  ? verification.isCorrect 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-yellow-500/50 bg-yellow-500/10'
                  : ''
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                      {verification && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="mt-0.5">
                              {verification.isCorrect ? (
                                <CheckCheck className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>{verification.comment}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <p className="font-medium">{question.question}</p>
                    </div>
                    
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className={`flex items-center gap-2 text-sm ${
                        verification && !verification.isCorrect 
                          ? 'bg-yellow-500/20 p-1.5 rounded border border-yellow-500/30' 
                          : ''
                      }`}>
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

                    {verification && !verification.isCorrect && (
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                        ⚠️ AI: {verification.comment}
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
                          <AlertDialogTitle>{language === 'ru' ? 'Удалить вопрос?' : 'Διαγραφή ερώτησης;'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {language === 'ru' ? 'Это действие нельзя отменить. Вопрос будет удалён навсегда.' : 'Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Η ερώτηση θα διαγραφεί οριστικά.'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{language === 'ru' ? 'Отмена' : 'Ακύρωση'}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(question.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {language === 'ru' ? 'Удалить' : 'Διαγραφή'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
