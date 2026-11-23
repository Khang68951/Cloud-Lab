import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { NAV_SECTIONS } from '../navigation';

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav');
  const { t: tc } = useTranslation();

  return (
    <nav aria-label={tc('a11y.mainNav')} className="flex flex-col gap-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.key}>
          <h2 className="mb-1.5 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t(`sections.${section.key}`)}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
