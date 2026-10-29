import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  SocialIcon,
  SocialButtons,
  SocialCommunityGrid,
  SOCIAL_LINKS,
  type SocialPlatform,
} from '../src/app/components/SocialIcons';

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

describe('SocialIcons Component (Figma Community 839558611085349133)', () => {
  const platforms: SocialPlatform[] = ['github', 'x', 'linkedin', 'discord', 'youtube', 'slack'];

  test.each(platforms)('renders SVG icon for platform %s with valid viewBox and vector path', (platform) => {
    render(createElement(SocialIcon, { name: platform, size: 24 }));
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('path')).not.toBeNull();
  });

  test('SocialButtons renders external links with security attributes and accessible labels', () => {
    render(createElement(SocialButtons, { platforms: ['github', 'x', 'discord'] }));
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(3);

    for (const link of Array.from(links)) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
      expect(link.getAttribute('aria-label')).toBeTruthy();
      expect(link.querySelector('svg')).not.toBeNull();
    }
  });

  test('SocialCommunityGrid renders all community channels with titles and descriptions', () => {
    render(createElement(SocialCommunityGrid));
    const cards = container.querySelectorAll('.social-community-card');
    expect(cards).toHaveLength(SOCIAL_LINKS.length);

    for (const link of SOCIAL_LINKS) {
      expect(container.textContent).toContain(link.label);
      if (link.handle) {
        expect(container.textContent).toContain(link.handle);
      }
    }
  });
});
