import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { menus, roleNames } from '../auth/menus';
import { homePathFor } from '../auth/types';
import { Logo } from './Logo';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [menuOpen]);

  if (!user) return null;
  const links = menus[user.role];

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-30 rounded-box bg-tea px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <header ref={headerRef} className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-4">
          <Logo to={homePathFor(user.role)} />

          <nav aria-label="Main" className="hidden flex-1 md:block">
            <ul className="flex gap-1">
              {links.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      `inline-flex h-10 items-center rounded-box px-3 font-semibold ${
                        isActive ? 'bg-turmeric-soft text-tea' : 'text-muted hover:text-tea'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="text-right leading-tight">
              <span className="block font-semibold">{user.name}</span>
              <span className="block text-sm text-muted">{roleNames[user.role]}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded-box border-[1.5px] border-line px-3 font-semibold hover:border-tea"
            >
              <LogOut size={18} aria-hidden="true" />
              Log out
            </button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="ml-auto grid size-11 place-items-center rounded-box hover:bg-paper md:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-line bg-white px-4 pb-4 pt-3 md:hidden">
            <p className="px-1 pb-3 leading-tight">
              <span className="block font-semibold">{user.name}</span>
              <span className="block text-sm text-muted">
                {roleNames[user.role]} · {user.phone}
              </span>
            </p>
            <nav aria-label="Main">
              <ul className="grid gap-1">
                {links.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex h-12 items-center gap-3 rounded-box px-3 font-semibold ${
                          isActive ? 'bg-turmeric-soft' : 'hover:bg-paper'
                        }`
                      }
                    >
                      <Icon size={20} aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex h-12 w-full items-center gap-3 rounded-box border-t border-line px-3 pt-2 font-semibold text-muted hover:text-tea"
            >
              <LogOut size={20} aria-hidden="true" />
              Log out
            </button>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
