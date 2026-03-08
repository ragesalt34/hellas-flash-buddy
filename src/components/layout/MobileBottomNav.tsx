import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export function MobileBottomNav() {
  const location = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      to: '/',
      label: language === 'ru' ? 'Главная' : 'Αρχική',
    },
    {
      to: '/learn',
      label: language === 'ru' ? 'Темы' : 'Θέματα',
    },
    {
      to: '/stats',
      label: language === 'ru' ? 'Статистика' : 'Στατιστικά',
    },
    ...(user
      ? [{ to: '/profile', label: language === 'ru' ? 'Профиль' : 'Προφίλ' }]
      : [{ to: '/login', label: language === 'ru' ? 'Войти' : 'Είσοδος' }]),
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={`mobile-nav-item${isActive(item.to) ? ' mobile-nav-item--active' : ''}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
