import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Save, X, BookOpen, Loader2, Search, Sparkles, Wand2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
};

const CATEGORIES = [
  { value: 'citizenship', labelRu: 'Гражданство', labelEl: 'Ιθαγένεια' },
  { value: 'visa', labelRu: 'Визы', labelEl: 'Βίζες' },
  { value: 'documents', labelRu: 'Документы', labelEl: 'Έγγραφα' },
  { value: 'procedures', labelRu: 'Процедуры', labelEl: 'Διαδικασίες' },
  { value: 'requirements', labelRu: 'Требования', labelEl: 'Απαιτήσεις' },
  { value: 'general', labelRu: 'Общее', labelEl: 'Γενικά' },
];

const AI_ACTIONS = [
  { id: 'improve', labelRu: 'Улучшить текст', labelEl: 'Βελτίωση κειμένου', prompt: 'Улучши и отредактируй следующий текст, сделай его более понятным и структурированным. Сохрани всю важную информацию. НЕ используй Markdown форматирование (звёздочки, решётки и т.д.). Верни только улучшенный текст без пояснений:' },
  { id: 'expand', labelRu: 'Расширить', labelEl: 'Επέκταση', prompt: 'Расширь и дополни следующий текст дополнительными деталями и примерами. НЕ используй Markdown форматирование. Верни только расширенный текст без пояснений:' },
  { id: 'shorten', labelRu: 'Сократить', labelEl: 'Συντόμευση', prompt: 'Сократи следующий текст, сохранив ключевую информацию. НЕ используй Markdown форматирование. Верни только сокращённый текст без пояснений:' },
  { id: 'format', labelRu: 'Форматировать', labelEl: 'Μορφοποίηση', prompt: 'Отформатируй следующий текст: добавь структуру с помощью нумерации (1. 2. 3.) и тире для списков. НЕ используй Markdown (звёздочки, решётки). Верни только отформатированный текст:' },
  { id: 'fix', labelRu: 'Исправить ошибки', labelEl: 'Διόρθωση σφαλμάτων', prompt: 'Исправь грамматические и орфографические ошибки в следующем тексте. Не изменяй форматирование. Верни только исправленный текст без пояснений:' },
];

export function KnowledgeBaseManager() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
  });

  // Fetch articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as KnowledgeArticle[];
    },
  });

  // AI text processing
  const processWithAI = async (action: typeof AI_ACTIONS[0]) => {
    if (!formData.content.trim()) {
      toast.error(language === 'ru' ? 'Введите текст для обработки' : 'Εισάγετε κείμενο για επεξεργασία');
      return;
    }

    setAiProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `${action.prompt}\n\n${formData.content}` }],
          skipContext: true, // Don't search knowledge base for this
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка AI');
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                result += content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (result.trim()) {
        setFormData(prev => ({ ...prev, content: result.trim() }));
        toast.success(language === 'ru' ? `Текст обработан: ${action.labelRu}` : `Κείμενο επεξεργάστηκε: ${action.labelEl}`);
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error(language === 'ru' ? 'Ошибка обработки AI' : 'Σφάλμα επεξεργασίας AI');
    } finally {
      setAiProcessing(false);
    }
  };

  // Generate title from content
  const generateTitle = async () => {
    if (!formData.content.trim()) {
      toast.error(language === 'ru' ? 'Введите текст для генерации заголовка' : 'Εισάγετε κείμενο για δημιουργία τίτλου');
      return;
    }

    setAiProcessing(true);
    try {
      const { data: { session: sess } } = await supabase.auth.getSession();
      const tkn = sess?.access_token;
      if (!tkn) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tkn}`,
        },
        body: JSON.stringify({
          messages: [{ 
            role: 'user', 
            content: `Придумай короткий информативный заголовок (максимум 10 слов) для следующего текста. Верни только заголовок без кавычек и пояснений:\n\n${formData.content.slice(0, 500)}` 
          }],
          skipContext: true,
        }),
      });

      if (!response.ok) throw new Error('Ошибка AI');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let result = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) result += content;
            } catch {}
          }
        }
      }

      if (result.trim()) {
        setFormData(prev => ({ ...prev, title: result.trim() }));
        toast.success(language === 'ru' ? 'Заголовок сгенерирован' : 'Ο τίτλος δημιουργήθηκε');
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error(language === 'ru' ? 'Ошибка генерации заголовка' : 'Σφάλμα δημιουργίας τίτλου');
    } finally {
      setAiProcessing(false);
    }
  };

  // Add article
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('knowledge_base')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success(language === 'ru' ? 'Статья добавлена' : 'Το άρθρο προστέθηκε');
      setIsAdding(false);
      setFormData({ title: '', content: '', category: 'general' });
    },
    onError: (error) => {
      toast.error(`${language === 'ru' ? 'Ошибка' : 'Σφάλμα'}: ${error.message}`);
    },
  });

  // Update article
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success(language === 'ru' ? 'Статья обновлена' : 'Το άρθρο ενημερώθηκε');
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`${language === 'ru' ? 'Ошибка' : 'Σφάλμα'}: ${error.message}`);
    },
  });

  // Delete article
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast.success(language === 'ru' ? 'Статья удалена' : 'Το άρθρο διαγράφηκε');
    },
    onError: (error) => {
      toast.error(`${language === 'ru' ? 'Ошибка' : 'Σφάλμα'}: ${error.message}`);
    },
  });

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (article: KnowledgeArticle) => {
    setIsAdding(false); // close "add" form if open to avoid shared state conflict
    setEditingId(article.id);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', category: 'general' });
  };

  const AIToolbar = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={aiProcessing}>
            {aiProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wand2 className="h-4 w-4 mr-2" />
            )}
            {language === 'ru' ? 'AI редактор' : 'Επεξεργαστής AI'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {AI_ACTIONS.map(action => (
            <DropdownMenuItem key={action.id} onClick={() => processWithAI(action)}>
              <Sparkles className="h-4 w-4 mr-2" />
              {language === 'ru' ? action.labelRu : action.labelEl}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        onClick={generateTitle}
        disabled={aiProcessing || !formData.content.trim()}
      >
        {aiProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {language === 'ru' ? 'Сгенерировать заголовок' : 'Δημιουργία τίτλου'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {language === 'ru' ? 'База знаний' : 'Βάση γνώσεων'}
          </h2>
          <p className="text-muted-foreground">
            {language === 'ru' ? 'Статьи для AI-ассистента' : 'Άρθρα για τον AI βοηθό'}
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'ru' ? 'Добавить статью' : 'Προσθήκη άρθρου'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={language === 'ru' ? 'Поиск статей...' : 'Αναζήτηση άρθρων...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{language === 'ru' ? 'Новая статья' : 'Νέο άρθρο'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder={language === 'ru' ? 'Заголовок' : 'Τίτλος'}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="flex-1"
              />
            </div>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'ru' ? 'Категория' : 'Κατηγορία'} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{language === 'ru' ? cat.labelRu : cat.labelEl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder={language === 'ru' ? 'Содержание статьи...' : 'Περιεχόμενο άρθρου...'}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
            />
            <AIToolbar />
            <div className="flex gap-2">
              <Button
                onClick={() => addMutation.mutate(formData)}
                disabled={!formData.title || !formData.content || addMutation.isPending}
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {language === 'ru' ? 'Сохранить' : 'Αποθήκευση'}
              </Button>
              <Button variant="outline" onClick={() => { setIsAdding(false); setFormData({ title: '', content: '', category: 'general' }); }}>
                <X className="h-4 w-4 mr-2" />
                {language === 'ru' ? 'Отмена' : 'Ακύρωση'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Articles list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredArticles?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery
              ? (language === 'ru' ? 'Статьи не найдены' : 'Δεν βρέθηκαν άρθρα')
              : (language === 'ru' ? 'База знаний пуста. Добавьте первую статью.' : 'Η βάση γνώσεων είναι κενή. Προσθέστε το πρώτο άρθρο.')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredArticles?.map(article => (
            <Card key={article.id}>
              <CardContent className="pt-6">
                {editingId === article.id ? (
                  <div className="space-y-4">
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{language === 'ru' ? cat.labelRu : cat.labelEl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                    />
                    <AIToolbar />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateMutation.mutate({ id: article.id, data: formData })}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        {language === 'ru' ? 'Сохранить' : 'Αποθήκευση'}
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-2" />
                        {language === 'ru' ? 'Отмена' : 'Ακύρωση'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {(() => { const c = CATEGORIES.find(c => c.value === article.category); return c ? (language === 'ru' ? c.labelRu : c.labelEl) : article.category; })()}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEditing(article)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            const msg = language === 'ru' ? 'Удалить эту статью?' : 'Διαγραφή αυτού του άρθρου;';
                            if (window.confirm(msg)) deleteMutation.mutate(article.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-muted-foreground text-sm whitespace-pre-wrap line-clamp-3">
                      {article.content}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
