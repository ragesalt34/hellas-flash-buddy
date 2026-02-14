import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden grain-overlay">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="relative liquid-glass-footer py-6 text-center text-sm text-muted-foreground">
        <div className="container">
          © 2026 Путь к греческому гражданству. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
