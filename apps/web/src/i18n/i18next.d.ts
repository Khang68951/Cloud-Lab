import 'i18next';
import type { resources } from './resources.ts';

// Makes `t('namespace:key')` type-checked against the English catalog.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
