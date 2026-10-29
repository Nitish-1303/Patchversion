import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  BrandIcon,
  BrandBadge,
  BRAND_REGISTRY,
  type BrandName,
} from '../src/app/components/BrandIcons';

let container: HTMLDivElement;
let root: Root;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function render(node: ReactNode) {
  act(() => root.render(node));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('BrandIcons Component (APIs and Ecosystem Marks)', () => {
  const brands: BrandName[] = [
    'postgresql',
    'github',
    'shopify',
    'stripe',
    'openai',
    'twilio',
    'docker',
    'vercel',
    'npm',
    'nodejs',
    'typescript',
  ];

  test.each(brands)('renders SVG icon for brand %s with valid viewBox and vector path', (brand) => {
    render(createElement(BrandIcon, { name: brand, size: 24 }));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('path')).not.toBeNull();
  });

  test('applies authentic brand color when useBrandColor is enabled', () => {
    render(createElement(BrandIcon, { name: 'stripe', size: 20, useBrandColor: true }));
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe(BRAND_REGISTRY.stripe.brandColor);
  });

  test('normalizes aliases and case-variations cleanly (e.g., PostgreSQL, Postgres, Postgre-SQL)', () => {
    render(createElement(BrandIcon, { name: 'PostgreSQL', size: 22 }));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  test('BrandBadge renders label and icon together', () => {
    render(createElement(BrandBadge, { name: 'openai', label: 'OpenAI GPT-4' }));
    const badge = container.querySelector('.brand-badge');
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toContain('OpenAI GPT-4');
    expect(badge?.querySelector('svg')).not.toBeNull();
  });

  test('returns null for unknown brand names gracefully', () => {
    render(createElement(BrandIcon, { name: 'non-existent-brand-xyz' }));
    const svg = container.querySelector('svg');
    expect(svg).toBeNull();
  });
});
