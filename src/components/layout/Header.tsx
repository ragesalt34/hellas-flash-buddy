import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogOut, User, Settings, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-3 mt-2">
        <div className="rounded-2xl liquid-glass border-b-0 border border-primary/8">
          <div className="container flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-greek shadow-lg shadow-primary/15 transition-all duration-500 group-hover:shadow-primary/30 group-hover:scale-105 spring-transition">
                <span className="text-lg font-bold text-primary-foreground">Ελ</span>
              </div>
              <span className="font-display text-lg font-semibold text-foreground hidden sm:inline">
                {t('app.title')}
              </span>
            </Link>

            <nav className="flex items-center gap-1.5">
              <LanguageSwitcher />
              
              {user ? (
                <>
                  <Link to="/learn">
                    <Button variant="ghost" size="sm" className="gap-2 liquid-glass-button hover:bg-primary/10 rounded-xl">
                      <BookOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('nav.learn')}</span>
                    </Button>
                  </Link>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="rounded-full liquid-glass-button border-primary/12 hover:border-primary/25 h-9 w-9">
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 liquid-glass border-primary/12 rounded-xl">
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
                    <Button variant="ghost" size="sm" className="liquid-glass-button hover:bg-primary/10 rounded-xl">{t('nav.login')}</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="gradient-greek text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-primary/30 transition-all duration-500 spring-transition rounded-xl">
                      {t('nav.register')}
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
