import { useMatches } from 'react-router';
import { getDomain } from '.';
import type { DomainDefinition } from './types';

/** Route handle set on each domain's route subtree. */
export interface DomainHandle {
  domain?: string;
  fullBleed?: boolean;
}

/** The domain of the current page, or undefined on app-level pages (hub, settings). */
export function useCurrentDomain(): DomainDefinition | undefined {
  const matches = useMatches();
  const id = matches.map((m) => (m.handle as DomainHandle | undefined)?.domain).find(Boolean);
  return getDomain(id);
}

/** The domain of a page that only exists inside a domain (course pages). */
export function useDomain(): DomainDefinition {
  const d = useCurrentDomain();
  if (!d) throw new Error('useDomain() used outside a domain route');
  return d;
}
