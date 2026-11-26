import type { MDXComponents } from 'mdx/types';
import { Callout } from './Callout';

/**
 * Components every lesson's MDX can use. Domain-specific widgets (e.g. the
 * Cloud domain's <TryLab>) are registered by the domain (DomainDefinition.mdx).
 */
export const mdxComponents: MDXComponents = {
  Callout,
  table: (props) => (
    <div className="my-5 overflow-x-auto rounded-lg border">
      <table {...props} />
    </div>
  ),
};
