import { countWord, useLanguage } from '../i18n';
import { StudyCompletion } from './StudyCompletion';

type Props = { count: number; onRepeat: () => void; onHome: () => void };

export function VocabCompletion({ count, onRepeat, onHome }: Props) {
  const { t, language } = useLanguage();
  return <StudyCompletion
    title={t('vocab.completedTitle')}
    result={t('vocab.completedCount').replace('{count}', String(count)).replace('{words}', countWord(count, 'word', language))}
    description={t('vocab.completedDescription')}
    repeat={{ label: t('common.retry'), onClick: onRepeat }}
    home={{ label: t('nav.menu'), onClick: onHome }}
  />;
}
