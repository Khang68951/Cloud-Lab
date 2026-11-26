import type { SimResult } from '@learninglab/cloud-sim';
import { createContext, useContext } from 'react';

export interface LabContextValue {
  result: SimResult | null;
  /** Node ids currently highlighted from the review panel. */
  highlighted: Set<string>;
  killed: Set<string>;
}

export const LabContext = createContext<LabContextValue>({ result: null, highlighted: new Set(), killed: new Set() });

export const useLab = () => useContext(LabContext);
