import { createElement, type ReactNode } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, type Root } from 'react-dom/client';
import ContactForm from '../src/app/components/ContactForm';
import { WorkflowTabs } from '../src/app/components/Experience';
import DashboardPage from '../src/app/dashboard/page';

let container: HTMLDivElement;
let root: Root;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function render(node: ReactNode) {
  act(() => root.render(node));
}

function click(element: HTMLElement) {
  act(() => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: jest.fn((media: string) => ({
      media,
      matches: media === '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('workflow tabs', () => {
  beforeEach(() => render(createElement(WorkflowTabs)));

  test('switches steps and keeps the selected tab connected to its panel', () => {
    const mapTab = container.querySelector<HTMLButtonElement>('#workflow-tab-1')!;
    click(mapTab);

    expect(mapTab.getAttribute('aria-selected')).toBe('true');
    expect(container.textContent).toContain('See the affected call sites.');
    expect(container.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('workflow-tab-1');
  });

  test('supports wrapped arrow-key navigation and moves focus with selection', () => {
    const detectTab = container.querySelector<HTMLButtonElement>('#workflow-tab-0')!;
    act(() => detectTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })));

    const proveTab = container.querySelector<HTMLButtonElement>('#workflow-tab-3')!;
    expect(proveTab.getAttribute('aria-selected')).toBe('true');
    expect(proveTab.tabIndex).toBe(0);
    expect(document.activeElement).toBe(proveTab);
  });
});

test('dashboard route states that account data is unavailable and loads no fixture records', () => {
  render(createElement(DashboardPage));

  expect(container.querySelector('h1')?.textContent).toBe('Dashboard access is not available yet.');
  expect(container.textContent).toContain('Authentication, repository authorization, and persistent workspace data have not been implemented.');
  expect(container.textContent).toContain('No repository, dependency, validation, activity, or pull request data has been loaded.');
  expect(container.textContent).not.toContain('mockpay');
});

test('contact preview confirms submission is local and stores no message', () => {
  render(createElement(ContactForm));
  const form = container.querySelector('form')!;
  act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

  expect(container.textContent).toContain('This preview does not send messages yet. No information was stored.');
});
