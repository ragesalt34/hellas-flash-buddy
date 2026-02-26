import { ReactNode } from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: '#E8E6E1' }}>
      {/* Ambient blobs */}
      <div className="ambient-layer">
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
      </div>
      {/* Noise texture */}
      <div className="noise-overlay" />
      <Header />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <footer className="relative z-10 liquid-glass-footer py-5 text-center text-sm text-muted-foreground">
        <div className="container">
          © {new Date().getFullYear()} Путь к греческому гражданству. Все права защищены.
        </div>
      </footer>
    </div>
  );
}
