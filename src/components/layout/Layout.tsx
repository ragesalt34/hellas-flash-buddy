import { ReactNode } from 'react';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { useLanguage } from '@/contexts/LanguageContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Ambient blobs — z-index: 0, above body dots but below content */}
      <div className="ambient-layer">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>
      <Header />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <footer className="relative z-10 liquid-glass-footer py-5 text-center text-sm text-muted-foreground mobile-footer-hidden">
        <div className="container">
          © {new Date().getFullYear()}{' '}
          {language === 'ru'
            ? 'Путь к греческому гражданству. Все права защищены.'
            : 'Δρόμος προς την ελληνική ιθαγένεια. Με επιφύλαξη παντός δικαιώματος.'}
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
