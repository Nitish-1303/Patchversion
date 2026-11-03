import path from 'path';
import fs from 'fs';
import os from 'os';
import { OpenAIV3ToV4Rule } from '../src/migration/rules/openai-v3-to-v4';
import { NextJs14To15AsyncRule } from '../src/migration/rules/nextjs-v14-to-v15';
import { StripePaymentIntentsRule } from '../src/migration/rules/stripe-rename';
import { AxiosV0ToV1Rule } from '../src/migration/rules/axios-v0-to-v1';
import { React18To19RefRule } from '../src/migration/rules/react-v18-to-v19';
import { ZodV3ModernizeRule } from '../src/migration/rules/zod-v3-upgrade';
import { defaultMigrationRegistry } from '../src/migration/registry';

describe('Real-World Migration Rules', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchbay-migration-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('Registry Discovery', () => {
    it('discovers OpenAI rule for openai package upgrade v3 -> v4', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('openai', '3.3.0', '4.20.0');
      expect(applicable.some(r => r.id === 'openai-v3-to-v4-client')).toBe(true);
    });

    it('discovers Next.js rule for next package upgrade v14 -> v15', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('next', '14.2.5', '15.0.0');
      expect(applicable.some(r => r.id === 'nextjs-v14-to-v15-async-headers')).toBe(true);
    });

    it('discovers Stripe rule for stripe package upgrade v10 -> v12', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('stripe', '10.12.0', '12.0.0');
      expect(applicable.some(r => r.id === 'stripe-v10-to-v12-payment-intents')).toBe(true);
    });
  });

  describe('OpenAIV3ToV4Rule', () => {
    it('transforms Configuration/OpenAIApi and createChatCompletion', async () => {
      const rule = new OpenAIV3ToV4Rule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { openai: '^3.3.0' } }),
      );

      const code = `
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({ apiKey: 'test-key' });
const openai = new OpenAIApi(configuration);

export async function runChat() {
  const response = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'hello' }],
  });
  return response.data;
}
`;
      const filePath = path.join(tmpDir, 'chat.ts');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'openai',
        fromVersion: '3.3.0',
        toVersion: '4.20.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('chat.ts');
      expect(result.unifiedDiff).toContain("import OpenAI from 'openai'");
      expect(result.unifiedDiff).toContain('openai.chat.completions.create');
      expect(result.diffHash).toBeTruthy();
    });
  });

  describe('NextJs14To15AsyncRule', () => {
    it('transforms synchronous cookies() and headers() calls into await calls', async () => {
      const rule = new NextJs14To15AsyncRule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.2.0' } }),
      );

      const code = `
import { cookies, headers } from 'next/headers';

export async function ServerComponent() {
  const cookieStore = cookies();
  const token = cookieStore.get('token');
  const headerStore = headers();
  const host = headerStore.get('host');
  return { token, host };
}
`;
      const filePath = path.join(tmpDir, 'server-page.ts');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'next',
        fromVersion: '14.2.0',
        toVersion: '15.0.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('server-page.ts');
      expect(result.unifiedDiff).toContain('await cookies()');
      expect(result.unifiedDiff).toContain('await headers()');
      expect(result.diffHash).toBeTruthy();
    });
  });

  describe('StripePaymentIntentsRule', () => {
    it('transforms stripe.charges.create({ source }) to stripe.paymentIntents.create({ payment_method })', async () => {
      const rule = new StripePaymentIntentsRule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { stripe: '^10.0.0' } }),
      );

      const code = `
import Stripe from 'stripe';
const stripe = new Stripe('sk_test_123', { apiVersion: '2022-11-15' });

export async function chargeCustomer(customerId: string, amount: number) {
  return await stripe.charges.create({
    amount,
    currency: 'usd',
    customer: customerId,
    source: 'tok_visa',
  });
}
`;
      const filePath = path.join(tmpDir, 'billing.ts');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'stripe',
        fromVersion: '10.0.0',
        toVersion: '12.0.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('billing.ts');
      expect(result.unifiedDiff).toContain('stripe.paymentIntents.create');
      expect(result.unifiedDiff).toContain('payment_method: \'tok_visa\'');
      expect(result.diffHash).toBeTruthy();
    });
  });

  describe('AxiosV0ToV1Rule', () => {
    it('discovers React 19 rule in registry', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('react', '18.2.0', '19.0.0');
      expect(applicable.some(r => r.id === 'react-v18-to-v19-forward-ref')).toBe(true);
    });

    it('discovers Zod v3 rule in registry', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('zod', '2.0.0', '3.22.0');
      expect(applicable.some(r => r.id === 'zod-v3-transformer-to-transform')).toBe(true);
    });

    it('discovers Axios rule in registry', () => {
      const applicable = defaultMigrationRegistry.findApplicableRules('axios', '0.27.2', '1.6.0');
      expect(applicable.some(r => r.id === 'axios-v0-to-v1-promise-all')).toBe(true);
    });

    it('transforms axios.all to Promise.all and modernizes axios.spread', async () => {
      const rule = new AxiosV0ToV1Rule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { axios: '^0.27.0' } }),
      );

      const code = `
import axios from 'axios';

export async function fetchAllUsers() {
  const req1 = axios.get('/api/users/1');
  const req2 = axios.get('/api/users/2');
  return axios.all([req1, req2]);
}
`;
      const filePath = path.join(tmpDir, 'fetcher.ts');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'axios',
        fromVersion: '0.27.2',
        toVersion: '1.6.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('fetcher.ts');
      expect(result.unifiedDiff).toContain('Promise.all([req1, req2])');
      expect(result.diffHash).toBeTruthy();
    });
  });
  describe('React18To19RefRule', () => {
    it('unwraps forwardRef to standard function component', async () => {
      const rule = new React18To19RefRule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.2.0' } }),
      );

      const code = `
import React, { forwardRef } from 'react';

export const TextInput = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});
`;
      const filePath = path.join(tmpDir, 'TextInput.tsx');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'react',
        fromVersion: '18.2.0',
        toVersion: '19.0.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('TextInput.tsx');
      expect(result.unifiedDiff).toContain('export const TextInput = (props, ref) => {');
      expect(result.diffHash).toBeTruthy();
    });
  });

  describe('ZodV3ModernizeRule', () => {
    it('migrates z.transformer to z.transform', async () => {
      const rule = new ZodV3ModernizeRule();

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { zod: '^2.0.0' } }),
      );

      const code = `
import { z } from 'zod';

export const StringToNumSchema = z.string().transformer((val) => Number(val));
`;
      const filePath = path.join(tmpDir, 'schema.ts');
      fs.writeFileSync(filePath, code);

      const result = await rule.execute({
        repoPath: tmpDir,
        packageName: 'zod',
        fromVersion: '2.0.0',
        toVersion: '3.22.0',
      });

      expect(result.preconditionsSatisfied).toBe(true);
      expect(result.filesModified).toContain('schema.ts');
      expect(result.unifiedDiff).toContain('.transform((val) => Number(val))');
      expect(result.diffHash).toBeTruthy();
    });
  });
});
