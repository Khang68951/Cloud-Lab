import { localize } from '@learninglab/shared';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { DOMAINS } from '@/domains';
import { useCurrentDomain } from '@/domains/useDomain';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { APP_NAV, domainNav, type NavSection } from '../navigation';
import { domainPath } from '../paths';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  );

function Item({ to, end, icon: Icon, label, onNavigate }: { to: string; end?: boolean; icon: LucideIcon; label: ReactNode; onNavigate?: () => void }) {
  return (
    <li>
      <NavLink to={to} end={end} onClick={onNavigate} className={linkClass}>
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 truncate">{label}</span>
      </NavLink>
    </li>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-1.5 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

/**
 * Sidebar. Inside a domain: that domain's own sections first, then the list of
 * domains and the app links. On app pages (hub, settings): domains + app links.
 */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation();
  const locale = currentLocale();
  const domain = useCurrentDomain();
  const sections: NavSection[] = domain ? domainNav(domain) : [];

  return (
    <nav aria-label={tc('a11y.mainNav')} className="flex flex-col gap-6">
      {domain && (
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
            <domain.icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{localize(domain.name, locale)}</span>
            <span className="block truncate text-xs text-muted-foreground">{localize(domain.tagline, locale)}</span>
          </span>
        </div>
      )}
      {sections.map((section) => (
        <Section key={section.key} title={t(`sections.${section.key}`)}>
          {section.items.map((item) => (
            <Item key={item.to} to={item.to} end={item.end} icon={item.icon} label={t(item.labelKey)} onNavigate={onNavigate} />
          ))}
        </Section>
      ))}
      <Section title={t('sections.domains')}>
        {DOMAINS.map((d) => (
          <Item key={d.id} to={domainPath(d.id)} icon={d.icon} label={localize(d.name, locale)} onNavigate={onNavigate} />
        ))}
      </Section>
      <Section title={t(`sections.${APP_NAV.key}`)}>
        {APP_NAV.items.map((item) => (
          <Item key={item.to} to={item.to} end={item.end} icon={item.icon} label={t(item.labelKey)} onNavigate={onNavigate} />
        ))}
      </Section>
    </nav>
  );
}
