import type { MDXComponents } from 'mdx/types';
import { AvailabilityCalculator } from './AvailabilityCalculator';
import { Callout } from './Callout';
import { CostCrossover } from './CostCrossover';
import { ServiceCompare } from './ServiceCompare';
import { TryLab } from './TryLab';

/**
 * Components available inside lesson MDX. To add a new interactive widget:
 * build it here and register it — lesson authors can then write <MyWidget />.
 */
export const mdxComponents: MDXComponents = {
  Callout,
  TryLab,
  ServiceCompare,
  CostCrossover,
  AvailabilityCalculator,
  table: (props) => (
    <div className="my-5 overflow-x-auto rounded-lg border">
      <table {...props} />
    </div>
  ),
};
