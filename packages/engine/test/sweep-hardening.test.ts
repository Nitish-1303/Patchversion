/**
 * Sweep regressions (full-repo review, 2026-10-24): state-store
 * corruption tolerance, sandbox secret-file exclusion, contract-probe
 * drift determinism.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { AddressInfo } from 'net';
import { StateStore } from '../src/state/store';
import { isExcludedFromSandboxCopy } from '../src/sandbox/runner';
import { ContractProber } from '../src/probes/contract-probe';

jest.setTimeout(30_000);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-sweep-'));

afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

describe('state store resilience', () => {
  it('a corrupt record reads as null and is logged, never a crash', () => {
    const dir = path.join(tmpRoot, 'state-corrupt');
    const store = new StateStore(dir);
    store.saveWatchTarget({ packageName: 'good-pkg', ecosystem: 'npm', lastCheckedAt: null, lastKnownVersion: '1.0.0' });
    // corrupt the file on disk
    const file = path.join(dir, 'watch-targets', 'good-pkg.json');
    fs.writeFileSync(file, '{ not json !!!');
    expect(store.getWatchTarget('good-pkg')).toBeNull();
    // listing skips the corrupt record instead of throwing
    expect(() => store.listWatchTargets()).not.toThrow();
    const events = fs.readdirSync(path.join(dir, 'events'))
      .flatMap(f => fs.readFileSync(path.join(dir, 'events', f), 'utf-8').split('\n'))
      .filter(l => l.trim()).map(l => JSON.parse(l));
    expect(events.some(e => e.type === 'state_corrupt')).toBe(true);
  });

  it('writes are atomic - no tmp files left behind', () => {
    const dir = path.join(tmpRoot, 'state-atomic');
    const store = new StateStore(dir);
    store.saveWatchTarget({ packageName: 'pkg', ecosystem: 'npm', lastCheckedAt: null, lastKnownVersion: null });
    const leftovers = fs.readdirSync(path.join(dir, 'watch-targets')).filter(f => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
    expect(store.getWatchTarget('pkg')).not.toBeNull();
  });
});

describe('sandbox copy exclusions', () => {
  it('never copies secret-bearing files into the work dir', () => {
    for (const name of ['.env', '.env.local', '.env.production', 'key.pem', 'tls.key', 'credentials.json', 'id_rsa', 'id_ed25519', '.git']) {
      expect(isExcludedFromSandboxCopy(name)).toBe(true);
    }
    for (const name of ['package.json', 'index.js', 'src', 'README.md']) {
      expect(isExcludedFromSandboxCopy(name)).toBe(false);
    }
  });
});

describe('contract prober', () => {
  it('detects a removed field as breaking drift with a deterministic change id', async () => {
    const dir = path.join(tmpRoot, 'state-probe');
    const store = new StateStore(dir);
    const prober = new ContractProber(store, 60_000);

    let body = JSON.stringify({ id: 1, name: 'x', deprecated_field: 'present' });
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    });
    await new Promise<void>(r => server.listen(0, r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/charges`;

    try {
      await prober.captureBaseline(url, 'GET');
      // field removed upstream
      body = JSON.stringify({ id: 1, name: 'x' });
      const drifts1 = await prober.probeAll();
      const changes1 = store.listChanges();
      expect(drifts1.some(d => d.field === 'deprecated_field' && d.actualType === 'missing')).toBe(true);
      expect(changes1.length).toBe(1);
      expect(changes1[0].classification.isBreaking).toBe(true);
      expect(changes1[0].severity).toBe('breaking');

      // identical drift again: same deterministic id, still one record
      await prober.probeAll();
      const changes2 = store.listChanges();
      expect(changes2.length).toBe(1);
      expect(changes2[0].id).toBe(changes1[0].id);
    } finally {
      server.close();
    }
  });
});

describe('webhook receiver authentication', () => {
  const { WebhookReceiver } = require('../src/webhook-receiver');
  const { PatchversionEngine } = require('../src/engine');
  const crypto = require('crypto');

  function makeEngine(name: string) {
    return new PatchversionEngine({
      stateDir: path.join(tmpRoot, `wh-${name}`),
      sandboxMode: 'local',
      requireIsolation: false,
    });
  }

  async function post(port: number, body: string, headers: Record<string, string>) {
    const res = await fetch(`http://127.0.0.1:${port}/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-github-event': 'push', ...headers },
      body,
    });
    return res.status;
  }

  function startReceiver(receiver: InstanceType<typeof WebhookReceiver>): number {
    receiver.start(0);
    const server = (receiver as unknown as { server: http.Server }).server;
    return (server.address() as AddressInfo).port;
  }

  const savedEnv = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = savedEnv; });

  it('missing secret in production: refuses to start (fail closed)', () => {
    process.env.NODE_ENV = 'production';
    const receiver = new WebhookReceiver(makeEngine('prod'));
    expect(() => receiver.start(0)).toThrow(/required in production/);
  });

  it('valid signature accepted, invalid or missing signature rejected', async () => {
    process.env.NODE_ENV = 'production';
    const secret = 'test-webhook-secret';
    const receiver = new WebhookReceiver(makeEngine('signed'), secret);
    const port = startReceiver(receiver);
    try {
      const body = JSON.stringify({ ref: 'refs/heads/main' });
      const good = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
      expect(await post(port, body, { 'x-hub-signature-256': good })).toBe(200);
      expect(await post(port, body, { 'x-hub-signature-256': 'sha256=deadbeef' })).toBe(401);
      expect(await post(port, body, {})).toBe(401);
    } finally {
      receiver.stop();
    }
  });

  it('no secret outside production: starts with a warning (development only)', async () => {
    process.env.NODE_ENV = 'development';
    const receiver = new WebhookReceiver(makeEngine('dev'));
    const port = startReceiver(receiver);
    try {
      expect(await post(port, JSON.stringify({}), {})).toBe(200);
    } finally {
      receiver.stop();
    }
  });
});

describe('usage mapper repository isolation', () => {
  const { UsageMapper } = require('../src/usage-map/mapper');

  function makeRepo(name: string, chargeContent: string | null): string {
    const dir = path.join(tmpRoot, `map-${name}`);
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    if (chargeContent !== null) {
      fs.writeFileSync(path.join(dir, 'src', 'charge.js'), chargeContent);
    }
    fs.writeFileSync(path.join(dir, 'src', 'other.js'), 'module.exports = 42;\n');
    return dir;
  }

  const USES_MINIPAY = "const minipay = require('minipay');\nmodule.exports = () => minipay.charges.create({ source: 'x' });\n";
  const NO_MINIPAY = "const fs = require('fs');\nmodule.exports = () => fs.existsSync('x');\n";

  it('two repositories mapped sequentially in one process cannot contaminate each other', () => {
    const mapper = new UsageMapper();
    const repoA = makeRepo('a', USES_MINIPAY);
    const repoB = makeRepo('b', NO_MINIPAY);

    const mapA1 = mapper.mapPackageUsage(repoA, 'minipay', 'repo/a');
    expect(mapA1.callSites.length).toBe(1);
    expect(mapA1.repoId).toBe('repo/a');

    // Repo B has the same file layout but no minipay usage: zero sites,
    // and its own file count - nothing leaked from repo A.
    const mapB = mapper.mapPackageUsage(repoB, 'minipay', 'repo/b');
    expect(mapB.callSites.length).toBe(0);
    expect(mapB.totalFiles).toBe(2);
    expect(mapB.filesWithUsage).toBe(0);

    // Mapping A again still works after its files were forgotten
    const mapA2 = mapper.mapPackageUsage(repoA, 'minipay', 'repo/a');
    expect(mapA2.callSites.length).toBe(1);

    // And mapping B for a package only A-related code would match stays empty
    const mapB2 = mapper.mapPackageUsage(repoB, 'minipay', 'repo/b');
    expect(mapB2.callSites.length).toBe(0);
  });
});
