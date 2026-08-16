export const PUBLIC_SITE_ORIGIN = 'https://vaelinya.uk';

// Only these established public route families are valid discovery targets.
// New top-level route families fail closed until their publication intent is
// deliberately added here.
export const INDEXABLE_ROUTE_PREFIXES = Object.freeze([
  '/about/',
  '/artefacts/',
  '/characters/',
  '/language/',
  '/privacy/',
  '/read/',
  '/start/',
  '/world/',
]);

// These routes are deliberately reachable, but are not search-index targets.
export const PUBLIC_NON_INDEXABLE_ROUTE_PREFIXES = Object.freeze([
  '/contact/',
  '/encyclopedia/',
  '/lexicon/',
  '/stories/',
  '/studio/',
]);

export const PUBLIC_NON_INDEXABLE_ROUTES = Object.freeze([
  '/sitemap.xml',
]);

// These route classes are not valid public discovery targets. This is a
// crawler-output boundary, not an access-control mechanism.
export const NON_PUBLIC_ROUTE_PREFIXES = Object.freeze([
  '/hidden-notes/',
  '/labs/',
  '/private/',
]);

export const ROUTE_CLASS = Object.freeze({
  INDEXABLE: 'public-indexable',
  NON_INDEXABLE: 'public-non-indexable',
  NON_PUBLIC: 'private-internal-development',
});

function matchesRoute(pathname, route) {
  return pathname === route || pathname === route.slice(0, -1) || pathname.startsWith(route);
}

function matchesAny(pathname, routes) {
  return routes.some((route) => matchesRoute(pathname, route));
}

export function classifyPublicationUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return ROUTE_CLASS.NON_PUBLIC;
  }

  if (url.origin !== PUBLIC_SITE_ORIGIN || url.protocol !== 'https:' || url.search || url.hash) {
    return ROUTE_CLASS.NON_PUBLIC;
  }

  const { pathname } = url;
  if (pathname === '/') return ROUTE_CLASS.INDEXABLE;
  if (PUBLIC_NON_INDEXABLE_ROUTES.includes(pathname)) return ROUTE_CLASS.NON_INDEXABLE;
  if (matchesAny(pathname, PUBLIC_NON_INDEXABLE_ROUTE_PREFIXES)) return ROUTE_CLASS.NON_INDEXABLE;
  if (matchesAny(pathname, NON_PUBLIC_ROUTE_PREFIXES)) return ROUTE_CLASS.NON_PUBLIC;
  if (matchesAny(pathname, INDEXABLE_ROUTE_PREFIXES)) return ROUTE_CLASS.INDEXABLE;

  return ROUTE_CLASS.NON_PUBLIC;
}

export function isIndexablePublicationUrl(value) {
  return classifyPublicationUrl(value) === ROUTE_CLASS.INDEXABLE;
}
