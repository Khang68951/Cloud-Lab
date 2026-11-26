import { Menu, Search, WifiOff } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, ScrollRestoration, useMatches } from 'react-router';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LanguageMenu, ThemeMenu } from '@/features/settings/PreferenceControls';
import { SearchDialog } from '@/features/search/SearchDialog';
import { useSearchShortcut } from '@/features/search/useSearchShortcut';
import { SettingsSync } from '@/features/settings/SettingsSync';
import { useSettingsQuery } from '@/features/settings/useSettings';
import { Logo } from './Logo';
import { NavList } from './NavList';
import { useCurrentDomain, type DomainHandle } from '@/domains/useDomain';
import { cn } from '@/lib/utils';

export function AppShell() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useSearchShortcut(setSearchOpen);
  const settings = useSettingsQuery();
  const close = () => setMenuOpen(false);
  const fullBleed = useMatches().some((m) => (m.handle as DomainHandle | undefined)?.fullBleed);
  const domain = useCurrentDomain();

  // Each domain tints the primary colour with its own hue (on <html>, so dialogs and toasts follow).
  useEffect(() => {
    const root = document.documentElement;
    if (domain) root.style.setProperty('--brand-hue', String(domain.hue));
    else root.style.removeProperty('--brand-hue');
    root.dataset.domain = domain?.id ?? '';
  }, [domain]);

  return (
    <div className="min-h-dvh">
      <SettingsSync />
      <ScrollRestoration />
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Desktop sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar print:hidden', !fullBleed && 'lg:flex')}>
        <div className="flex h-14 items-center px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList />
        </div>
      </aside>

      <div className={cn(!fullBleed && 'lg:pl-64 print:pl-0')}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6 print:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn(!fullBleed && 'lg:hidden')} aria-label={t('a11y.openMenu')}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent title={t('a11y.mainNav')} closeLabel={t('a11y.closeMenu')}>
              <div className="flex h-14 items-center px-5">
                <Logo onNavigate={close} />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4">
                <NavList onNavigate={close} />
              </div>
            </SheetContent>
          </Sheet>
          <div className={cn(!fullBleed && 'lg:hidden')}>
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="text-muted-foreground sm:w-56 sm:justify-start"
              aria-label={t('search.open')}
            >
              <Search />
              <span className="hidden flex-1 text-left sm:inline">{t('search.open')}</span>
              <kbd className="hidden rounded border px-1 text-[10px] sm:inline">Ctrl K</kbd>
            </Button>
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
            <LanguageMenu />
            <ThemeMenu />
          </div>
        </header>

        {settings.isError && (
          <div role="status" className="flex items-start gap-3 border-b bg-warning-soft px-4 py-2.5 text-sm sm:px-6">
            <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p>
              <strong className="font-semibold">{t('api.offlineTitle')}.</strong> {t('api.offlineBody')}
            </p>
          </div>
        )}

        <main id="main" className={cn(fullBleed ? 'w-full' : 'mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10')}>
          <Suspense fallback={<div className="h-40" aria-busy="true" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
