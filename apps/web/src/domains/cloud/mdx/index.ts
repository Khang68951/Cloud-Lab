import type { MDXComponents } from 'mdx/types';
import { AvailabilityCalculator } from './AvailabilityCalculator';
import { CostCrossover } from './CostCrossover';
import { ServiceCompare } from './ServiceCompare';
import { TryLab } from './TryLab';

/** Components Cloud lessons can use in MDX, on top of the shared ones (Callout, tables). */
export const cloudMdx: MDXComponents = { TryLab, ServiceCompare, CostCrossover, AvailabilityCalculator };
