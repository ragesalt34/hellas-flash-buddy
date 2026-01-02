import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <div className="container">
          © 2026 Путь к греческому гражданству. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
