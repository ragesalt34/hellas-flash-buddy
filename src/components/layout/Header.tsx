import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogOut, User, Settings, Menu } from 'lucide-react';
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
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileOpen(false);
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

  return (
    <header className="sticky top-4 z-50 px-4 xl:px-8 2xl:px-16 mb-8 2xl:mb-12">
      <div className="max-w-[1200px] xl:max-w-[1600px] 2xl:max-w-[2200px] mx-auto pill-header flex items-center justify-between h-[60px] xl:h-[70px] 2xl:h-[80px] px-5 xl:px-8 2xl:px-12">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0" style={{ textDecoration: 'none' }}>
          <div
            className="w-10 h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14 rounded-full flex items-center justify-center text-white font-bold text-[17px] xl:text-[19px] 2xl:text-[22px] flex-shrink-0"
            style={{ background: '#2F3532' }}
          >
            Ελ
          </div>
          <span className="font-semibold text-[15px] xl:text-[17px] 2xl:text-[20px] hidden sm:block" style={{ color: '#2F3532' }}>
            Hellas Flash Buddy
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-8 xl:gap-12 2xl:gap-16">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                color: '#2F3532',
                opacity: isActive(link.to) ? 1 : 0.5,
                fontWeight: 500,
                fontSize: 'clamp(15px, 1vw, 18px)',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
              }}
            >
              {link.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full cursor-pointer transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    padding: '4px 12px 4px 4px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#2F3532',
                  }}
                >
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: '#D4D2CD' }} />
                  <span className="hidden sm:block">{user.email?.split('@')[0]}</span>
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

          {/* Language switcher — visible on mobile (hamburger removed) */}
          <div className="flex sm:hidden">
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
