import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The document head per route.
 *
 * Titles mirror the shell's TITLES map so the tab, the history entry and the
 * on-screen heading always say the same words. Crawlers get a description,
 * Open Graph tags and JSON-LD from index.html; this keeps them in sync.
 */

const DEFAULT = {
  title: 'AI Reel Factory — research, produce and publish Reels',
  description:
    'AI Reel Factory is the workspace that takes a story from research to a published Reel: discover, create, review, schedule and measure in one pipeline.',
};

const ROUTES = {
  '/login': {
    title: 'Sign in — AI Reel Factory',
    description: 'Sign in to the AI Reel Factory workspace.',
  },
  '/register': {
    title: 'Create account — AI Reel Factory',
    description: 'Create your AI Reel Factory workspace and start the pipeline.',
  },
  '/': {
    title: 'Overview',
    description: 'The state of the pipeline right now.',
  },
  '/discover': {
    title: 'Discover',
    description: 'Verified stories, scored and checked.',
  },
  '/creator': {
    title: 'Creator Studio',
    description: 'Upload, edit, preview and approve.',
  },
  '/library': {
    title: 'Library',
    description: 'Every Reel the workspace has produced.',
  },
  '/create': {
    title: 'Create Reel',
    description: 'Run the research pipeline end to end.',
  },
  '/analytics': {
    title: 'Analytics',
    description: 'What the published Reels actually did.',
  },
  '/calendar': {
    title: 'Schedule',
    description: 'When the factory runs on its own.',
  },
  '/jobs': {
    title: 'Pipeline jobs',
    description: 'Queued, running, finished and failed work.',
  },
  '/publishing': {
    title: 'Publishing',
    description: 'Instagram readiness and confirmed posts.',
  },
  '/templates': {
    title: 'Templates',
    description: 'Reusable looks for the creator.',
  },
  '/settings': {
    title: 'Settings',
    description: 'Providers, budgets and the workspace.',
  },
};

const BRAND = 'AI Reel Factory';

function resolve(pathname) {
  if (pathname.startsWith('/editor')) {
    return { title: 'Editor', description: 'Adjust a Reel before it goes out.' };
  }
  const route = ROUTES[pathname] ?? DEFAULT;
  const title =
    route.title === DEFAULT.title ? DEFAULT.title : `${route.title} — ${BRAND}`;
  return { title, description: route.description };
}

function setMeta(selector, attribute, value) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute.name, attribute.value);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

/** Keeps the tab title and the social meta in sync with the route. */
export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const { title, description } = resolve(pathname);
    document.title = title;
    setMeta('meta[name="description"]', { name: 'name', value: 'description' }, description);
    setMeta('meta[property="og:title"]', { name: 'property', value: 'og:title' }, title);
    setMeta(
      'meta[property="og:description"]',
      { name: 'property', value: 'og:description' },
      description
    );
    setMeta(
      'meta[property="og:url"]',
      { name: 'property', value: 'og:url' },
      window.location.origin + pathname
    );
    setMeta('meta[name="twitter:title"]', { name: 'name', value: 'twitter:title' }, title);
  }, [pathname]);

  return null;
}
