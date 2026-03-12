import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogOut, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: language === 'ru' ? 'Главная' : 'Αρχική' },
    { to: '/learn', label: language === 'ru' ? 'Темы' : 'Θέματα' },
    { to: '/stats', label: language === 'ru' ? 'Статистика' : 'Στατιστικά' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-4 z-50 px-4 fhd:px-8 qhd:px-16 mb-8 qhd:mb-12">
      <div className="max-w-[1200px] fhd:max-w-[1600px] qhd:max-w-[2200px] mx-auto pill-header flex items-center justify-between h-[60px] fhd:h-[70px] qhd:h-[80px] px-5 fhd:px-8 qhd:px-12">

        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0" style={{ textDecoration: 'none' }}>
          <div className="header-logo-badge">
            Ελ
          </div>
          <span className="header-brand-name hidden sm:block">
            Hellas Flash Buddy
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 xl:gap-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`header-nav-link ${isActive(link.to) ? 'header-nav-link--active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="header-lang-wrap">
            <LanguageSwitcher />
          </div>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="header-user-pill">
                  <div className="header-avatar">
                    {getInitials(user.email ?? 'US')}
                  </div>
                  <span className="hidden sm:block header-username">
                    {user.email?.split('@')[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.7)' }}
              >
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
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" style={{ color: '#2F3532', fontWeight: 500 }}>
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/register">
                <button className="btn-pebble" style={{ padding: '8px 18px', fontSize: '14px' }}>
                  {t('nav.register')}
                </button>
              </Link>
            </div>
          )}

          {/* Language switcher — mobile only */}
          <div className="flex sm:hidden">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}

