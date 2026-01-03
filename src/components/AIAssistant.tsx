import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function AIAssistant() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          language 
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${resp.status}`);
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            // Partial JSON, continue
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка';
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: language === 'ru' 
          ? `❌ ${errorMessage}` 
          : `❌ ${errorMessage}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const message = input.trim();
    setInput('');
    streamChat(message);
  };

  const clearHistory = () => {
    setMessages([]);
  };

  const placeholderText = language === 'ru' 
    ? 'Спросите о гражданстве, визах...' 
    : 'Ρωτήστε για ιθαγένεια, βίζες...';

  const titleText = language === 'ru' ? 'AI Ассистент' : 'AI Βοηθός';
  const subtitleText = language === 'ru' 
    ? 'Задайте вопрос о гражданстве Греции' 
    : 'Κάντε ερώτηση για την ελληνική ιθαγένεια';

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:scale-110 transition-transform duration-200',
          'hover:shadow-xl hover:shadow-primary/25',
          isOpen && 'scale-0 opacity-0'
        )}
        aria-label="Open AI Assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]',
          'bg-card border border-border rounded-2xl shadow-2xl',
          'flex flex-col overflow-hidden',
          'transition-all duration-300 ease-out',
          isOpen 
            ? 'opacity-100 translate-y-0 scale-100 h-[600px] max-h-[80vh]' 
            : 'opacity-0 translate-y-4 scale-95 h-0 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{titleText}</h3>
              <p className="text-xs text-muted-foreground">{subtitleText}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearHistory}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <p className="text-sm">
                {language === 'ru' 
                  ? 'Привет! Я помогу ответить на вопросы о гражданстве Греции, визах и процедурах.'
                  : 'Γεια! Θα σας βοηθήσω να απαντήσετε σε ερωτήσεις σχετικά με την ελληνική ιθαγένεια, τις βίζες και τις διαδικασίες.'}
              </p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}>
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4 text-primary" />
                )}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 max-w-[80%] text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content || '...'}</p>
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-muted/30">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholderText}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-background border border-border 
                text-sm text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50
                disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
