/**
 * Docs URLs, in one place.
 *
 * They were built independently in the analyzer and in the docs page, which is
 * how the homepage kept pointing at `/docs/#github` after the panes moved from
 * fragments to real paths - a link that still resolved, but landed on the
 * overview and skipped the page written for that provider.
 */
export const DOCS_ROOT = '/docs/';

export function docsHref(pane: string): string {
  return pane === 'overview' ? DOCS_ROOT : `${DOCS_ROOT}${pane}/`;
}

/** The inverse: `/docs/github/` -> `github`, anything else -> `overview`. */
export function docsPane(pathname: string, known: (slug: string) => boolean): string {
  const slug = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
  return slug && known(slug) ? slug : 'overview';
}
