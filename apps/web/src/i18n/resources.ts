/**
 * UI string catalogs. One JSON file per namespace per language:
 *   src/locales/<lang>/<namespace>.json
 * A new feature gets its own namespace; a domain's own pages use namespaces
 * named after it or its tools (cloud, lab, explore). `npm run i18n:check`
 * makes sure every language has exactly the same keys.
 */
import enCommon from '../locales/en/common.json';
import enCloud from '../locales/en/cloud.json';
import enHub from '../locales/en/hub.json';
import enLearn from '../locales/en/learn.json';
import enNav from '../locales/en/nav.json';
import enSettings from '../locales/en/settings.json';
import enSearch from '../locales/en/search.json';
import enGlossary from '../locales/en/glossary.json';
import enExplore from '../locales/en/explore.json';
import enPractice from '../locales/en/practice.json';
import enLesson from '../locales/en/lesson.json';
import enLab from '../locales/en/lab.json';
import viCommon from '../locales/vi/common.json';
import viCloud from '../locales/vi/cloud.json';
import viHub from '../locales/vi/hub.json';
import viLearn from '../locales/vi/learn.json';
import viNav from '../locales/vi/nav.json';
import viSettings from '../locales/vi/settings.json';
import viSearch from '../locales/vi/search.json';
import viGlossary from '../locales/vi/glossary.json';
import viExplore from '../locales/vi/explore.json';
import viPractice from '../locales/vi/practice.json';
import viLesson from '../locales/vi/lesson.json';
import viLab from '../locales/vi/lab.json';

export const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    hub: enHub,
    cloud: enCloud,
    learn: enLearn,
    settings: enSettings,
    search: enSearch,
    glossary: enGlossary,
    explore: enExplore,
    practice: enPractice,
    lesson: enLesson,
    lab: enLab,
  },
  vi: {
    common: viCommon,
    nav: viNav,
    hub: viHub,
    cloud: viCloud,
    learn: viLearn,
    settings: viSettings,
    search: viSearch,
    glossary: viGlossary,
    explore: viExplore,
    practice: viPractice,
    lesson: viLesson,
    lab: viLab,
  },
} as const;
