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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/learn', label: 'Topics' },
    { to: '/stats', label: 'Stats' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLiquidMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const cx = e.clientX, cy = e.clientY;
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${cx - rect.left}px`);
      el.style.setProperty('--my', `${cy - rect.top}px`);
    });
  };
  const handleLiquidLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty('--mx', '50%');
    e.currentTarget.style.setProperty('--my', '50%');
  };

  return (
    <header className="sticky top-4 z-50 px-4 mb-8">
      <div className="max-w-[1200px] mx-auto pill-header flex items-center justify-between h-[60px] px-5">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0" style={{ textDecoration: 'none' }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[17px] flex-shrink-0"
            style={{ background: '#2F3532' }}
          >
            Ελ
          </div>
          <span className="font-semibold text-[15px] hidden sm:block" style={{ color: '#2F3532' }}>
            Hellas Flash Buddy
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-8">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="liquid-hover"
              onMouseMove={handleLiquidMove}
              onMouseLeave={handleLiquidLeave}
              style={{
                color: '#2F3532',
                opacity: isActive(link.to) ? 1 : 0.5,
                fontWeight: 500,
                fontSize: '15px',
                textDecoration: 'none',
                transition: 'opacity 0.2s',
                padding: '6px 10px',
                borderRadius: '8px',
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

          {/* Mobile hamburger */}
          <div className="flex sm:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" style={{ color: '#2F3532' }}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 p-0"
                style={{ background: 'rgba(232,230,225,0.97)', backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.5)' }}
              >
                <div className="flex flex-col h-full pt-12 pb-8 px-6">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[17px]" style={{ background: '#2F3532' }}>
                      Ελ
                    </div>
                    <span className="font-semibold text-[15px]" style={{ color: '#2F3532' }}>Hellas Flash Buddy</span>
                  </div>

                  <nav className="flex flex-col gap-1 flex-1">
                    {navLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center h-12 px-4 rounded-xl font-medium text-[15px] transition-all"
                        style={{
                          color: '#2F3532',
                          background: isActive(link.to) ? 'rgba(255,255,255,0.6)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="mt-4">
                      <LanguageSwitcher />
                    </div>
                  </nav>

                  <div className="mt-auto flex flex-col gap-2">
                    {user ? (
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 h-12 px-4 rounded-xl font-medium text-[15px] w-full text-destructive"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <LogOut className="h-5 w-5" />
                        {t('nav.logout')}
                      </button>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setMobileOpen(false)}>
                          <Button variant="ghost" className="w-full h-12 rounded-xl" style={{ color: '#2F3532' }}>
                            {t('nav.login')}
                          </Button>
                        </Link>
                        <Link to="/register" onClick={() => setMobileOpen(false)}>
                          <button className="btn-pebble w-full justify-center" style={{ borderRadius: '12px', padding: '12px', width: '100%' }}>
                            {t('nav.register')}
                          </button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
