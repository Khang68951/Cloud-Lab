import { cloudDomain } from './cloud';
import type { DomainDefinition } from './types';

export type { DomainDefinition } from './types';

/**
 * Every domain, in the order the hub shows them. A new domain =
 * a folder here exporting a DomainDefinition + one line in this list
 * + its content package (see README → "Thêm một mảng học mới").
 */
export const DOMAINS: readonly DomainDefinition[] = [cloudDomain];

export function getDomain(id: string | undefined): DomainDefinition | undefined {
  return DOMAINS.find((d) => d.id === id);
}
