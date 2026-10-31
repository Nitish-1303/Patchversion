import { FrameworkRole } from '@patchversion/shared';

export interface FrameworkDetection {
  name: string;
  version?: string;
  role: FrameworkRole;
  category: 'web-framework' | 'backend-framework' | 'bundler' | 'compiler' | 'test-runner' | 'styling' | 'utility';
}

const KNOWN_FRAMEWORKS: Record<string, { role: FrameworkRole; category: FrameworkDetection['category'] }> = {
  // Web Frameworks
  next: { role: 'framework', category: 'web-framework' },
  react: { role: 'framework', category: 'web-framework' },
  'react-dom': { role: 'framework', category: 'web-framework' },
  'react-native': { role: 'framework', category: 'web-framework' },
  vue: { role: 'framework', category: 'web-framework' },
  nuxt: { role: 'framework', category: 'web-framework' },
  svelte: { role: 'framework', category: 'web-framework' },
  '@angular/core': { role: 'framework', category: 'web-framework' },
  gatsby: { role: 'framework', category: 'web-framework' },
  remix: { role: 'framework', category: 'web-framework' },
  '@remix-run/react': { role: 'framework', category: 'web-framework' },
  astro: { role: 'framework', category: 'web-framework' },

  // Backend Frameworks
  express: { role: 'framework', category: 'backend-framework' },
  fastify: { role: 'framework', category: 'backend-framework' },
  '@nestjs/core': { role: 'framework', category: 'backend-framework' },
  koa: { role: 'framework', category: 'backend-framework' },
  hapi: { role: 'framework', category: 'backend-framework' },

  // Compilers & Bundlers
  typescript: { role: 'build-tool', category: 'compiler' },
  webpack: { role: 'build-tool', category: 'bundler' },
  vite: { role: 'build-tool', category: 'bundler' },
  turbo: { role: 'build-tool', category: 'bundler' },
  rollup: { role: 'build-tool', category: 'bundler' },
  esbuild: { role: 'build-tool', category: 'bundler' },
  '@babel/core': { role: 'build-tool', category: 'compiler' },
  postcss: { role: 'build-tool', category: 'styling' },
  tailwindcss: { role: 'build-tool', category: 'styling' },

  // Testing
  jest: { role: 'testing', category: 'test-runner' },
  vitest: { role: 'testing', category: 'test-runner' },
  mocha: { role: 'testing', category: 'test-runner' },
  cypress: { role: 'testing', category: 'test-runner' },
  '@playwright/test': { role: 'testing', category: 'test-runner' },

  // Common Utilities
  lodash: { role: 'utility', category: 'utility' },
  underscore: { role: 'utility', category: 'utility' },
  ramda: { role: 'utility', category: 'utility' },
  axios: { role: 'utility', category: 'utility' },
  rxjs: { role: 'utility', category: 'utility' },
};

/**
 * Identifies recognized frameworks, compilers, and tools across package dependencies.
 */
export function detectFrameworks(dependencies: Map<string, string>): FrameworkDetection[] {
  const detections: FrameworkDetection[] = [];

  for (const [pkgName, version] of dependencies.entries()) {
    const known = KNOWN_FRAMEWORKS[pkgName];
    if (known) {
      detections.push({
        name: pkgName,
        version: version || undefined,
        role: known.role,
        category: known.category,
      });
    }
  }

  return detections;
}

/**
 * Assigns an appropriate framework or dependency role to a package name.
 */
export function classifyFrameworkRole(packageName: string, isDev: boolean): FrameworkRole {
  const known = KNOWN_FRAMEWORKS[packageName];
  if (known) return known.role;
  return isDev ? 'dev' : 'runtime';
}
