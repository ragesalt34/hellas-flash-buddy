import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogOut, User, Settings, BookOpen, Menu, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-3 mt-2">
        <div className={`rounded-2xl liquid-glass-refract ${scrolled ? 'header-scrolled' : ''} border-b-0`}>
          <div className="container flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-greek shadow-lg shadow-primary/15 transition-all duration-500 group-hover:shadow-primary/30 group-hover:scale-105 spring-transition">
                <span className="text-lg font-bold text-primary-foreground">Ελ</span>
              </div>
              <span className="font-display text-lg font-semibold text-foreground hidden sm:inline">
                {t('app.title')}
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1.5">
              <LanguageSwitcher />
              
              {user ? (
                <>
                  <Link to="/learn">
                    <Button variant="ghost" size="sm" className="gap-2 glass-button-v2 hover:bg-primary/10 rounded-xl">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('nav.learn')}</span>
                    </Button>
                  </Link>

                  <Link to="/profile">
                    <Button variant="outline" size="icon" className="rounded-full glass-button-v2 border-primary/12 hover:border-primary/25 h-9 w-9" title={t('nav.profile')}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full glass-button-v2 border-primary/12 hover:border-primary/25 h-9 w-9">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 liquid-glass-refract border-primary/12 rounded-xl">
                      <DropdownMenuItem asChild>
                        <Link to="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          {t('nav.profile')}
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            {t('nav.admin')}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="glass-button-v2 hover:bg-primary/10 rounded-xl">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="gradient-greek text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-primary/30 transition-all duration-500 spring-transition rounded-xl">
                      {t('nav.register')}
                    </Button>
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile nav */}
            <div className="flex sm:hidden items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 glass-button-v2 rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-background/95 backdrop-blur-xl border-primary/12 p-0">
                  <div className="flex flex-col h-full pt-12 pb-8 px-6">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 mb-8">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-greek shadow-lg shadow-primary/15">
                        <span className="text-lg font-bold text-primary-foreground">Ελ</span>
                      </div>
                      <span className="font-display text-lg font-semibold text-foreground">
                        {t('app.title')}
                      </span>
                    </div>

                    {user ? (
                      <nav className="flex flex-col gap-2 flex-1">
                        <Link to="/learn" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl glass-button-v2 hover:bg-primary/10">
                            <BookOpen className="h-5 w-5" />
                            {t('nav.learn')}
                          </Button>
                        </Link>
                        <Link to="/profile" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl glass-button-v2 hover:bg-primary/10">
                            <BarChart3 className="h-5 w-5" />
                            {t('nav.profile')}
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setMobileOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start gap-3 h-12 rounded-xl glass-button-v2 hover:bg-primary/10">
                              <Settings className="h-5 w-5" />
                              {t('nav.admin')}
                            </Button>
                          </Link>
                        )}

                        <div className="mt-auto flex flex-col gap-2">
                          <LanguageSwitcher />
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start gap-3 h-12 rounded-xl text-destructive hover:bg-destructive/10"
                            onClick={handleSignOut}
                          >
                            <LogOut className="h-5 w-5" />
                            {t('nav.logout')}
                          </Button>
                        </div>
                      </nav>
                    ) : (
                      <nav className="flex flex-col gap-3">
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full h-12 rounded-xl glass-button-v2 hover:bg-primary/10">
                            {t('nav.login')}
                          </Button>
                        </Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)}>
                          <Button className="w-full h-12 gradient-greek text-primary-foreground shadow-lg shadow-primary/15 rounded-xl">
                            {t('nav.register')}
                          </Button>
                        </Link>
                        <div className="mt-4">
                          <LanguageSwitcher />
                        </div>
                      </nav>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
