import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Save, X, BookOpen, Loader2, Search } from 'lucide-react';

type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
};

const CATEGORIES = [
  { value: 'citizenship', label: 'Гражданство' },
  { value: 'visa', label: 'Визы' },
  { value: 'documents', label: 'Документы' },
  { value: 'procedures', label: 'Процедуры' },
  { value: 'requirements', label: 'Требования' },
  { value: 'general', label: 'Общее' },
];

export function KnowledgeBaseManager() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      toast.success('Статья добавлена');
      setIsAdding(false);
      setFormData({ title: '', content: '', category: 'general' });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
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
      toast.success('Статья обновлена');
      setEditingId(null);
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
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
      toast.success('Статья удалена');
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const filteredArticles = articles?.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (article: KnowledgeArticle) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            База знаний
          </h2>
          <p className="text-muted-foreground">
            Статьи для AI-ассистента
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить статью
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск статей..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Add form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Новая статья</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Заголовок"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Содержание статьи..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={6}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => addMutation.mutate(formData)}
                disabled={!formData.title || !formData.content || addMutation.isPending}
              >
                {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Сохранить
              </Button>
              <Button variant="outline" onClick={() => { setIsAdding(false); setFormData({ title: '', content: '', category: 'general' }); }}>
                <X className="h-4 w-4 mr-2" />
                Отмена
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
            {searchQuery ? 'Статьи не найдены' : 'База знаний пуста. Добавьте первую статью.'}
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
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => updateMutation.mutate({ id: article.id, data: formData })}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Сохранить
                      </Button>
                      <Button variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-2" />
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{article.title}</h3>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {CATEGORIES.find(c => c.value === article.category)?.label || article.category}
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
                          onClick={() => deleteMutation.mutate(article.id)}
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
