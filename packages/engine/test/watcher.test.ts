import fs from 'fs';
import os from 'os';
import path from 'path';
import https from 'https';
import { EventEmitter } from 'events';
import type { ClientRequest, IncomingMessage } from 'http';
import { PassThrough } from 'stream';
import { NpmWatcher } from '../src/watcher/npm-watcher';
import { StateStore } from '../src/state/store';
import { ChangeRecord } from '@patchversion/shared';

type NpmWatcherTestAccess = {
  pollAllInner(): Promise<ChangeRecord[]>;
  fetchRegistry(packageName: string): Promise<unknown>;
};

type FakeRequest = EventEmitter & {
  setTimeout: jest.Mock<void, [number, () => void]>;
  destroy: jest.Mock<void, [Error?]>;
  _timeoutMs?: number;
  _timeoutCb?: () => void;
};

function mockRegistryGet(req: FakeRequest, respond?: (response: PassThrough) => void): void {
  const getSpy = jest.spyOn(https, 'get') as unknown as jest.SpyInstance<unknown, unknown[]>;
  getSpy.mockImplementation((...args: unknown[]) => {
    const callback = args.at(-1);
    if (respond && typeof callback === 'function') {
      const response = new PassThrough();
      (callback as (value: IncomingMessage) => void)(response as unknown as IncomingMessage);
      process.nextTick(() => respond(response));
    }
    return req as unknown as ClientRequest;
  });
}

function tmpStore(): { store: StateStore; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-test-'));
  return { store: new StateStore(dir), dir };
}

describe('NpmWatcher poll overlap guard', () => {
  test('a second poll while one is in flight is skipped and logged', async () => {
    const { store, dir } = tmpStore();
    const watcher = new NpmWatcher(store, 60_000);
    const internals = watcher as unknown as NpmWatcherTestAccess;

    const hanging = new Promise<never>(() => {});
    const spy = jest
      .spyOn(internals, 'pollAllInner')
      .mockImplementationOnce(() => hanging)
      .mockImplementation(() => Promise.resolve([]));

    const first = watcher.pollAll(); // never settles
    const second = await watcher.pollAll();

    expect(second).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1); // inner not re-entered

    // The skip is visible in the event log
    const today = new Date().toISOString().slice(0, 10);
    const log = fs.readFileSync(
      path.join(dir, 'events', `${today}.jsonl`),
      'utf-8',
    );
    expect(log).toContain('watcher_overlap_skipped');

    // After the first poll finishes, polling works again
    spy.mockRestore();
    const third = await watcher.pollAll();
    expect(third).toEqual([]);
    void first;
  });
});

describe('NpmWatcher registry request hardening', () => {
  afterEach(() => jest.restoreAllMocks());

  function fakeRequest(): FakeRequest {
    const req = new EventEmitter() as FakeRequest;
    req.setTimeout = jest.fn((ms: number, cb: () => void) => {
      req._timeoutMs = ms;
      req._timeoutCb = cb;
    });
    req.destroy = jest.fn((err?: Error) => {
      req.emit('error', err ?? new Error('destroyed'));
    });
    return req;
  }

  test('sets a 30s timeout on the registry request', async () => {
    const req = fakeRequest();
    mockRegistryGet(req, (response) => response.end(Buffer.from('{}')));

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await (watcher as unknown as NpmWatcherTestAccess).fetchRegistry('lodash');
    expect(req.setTimeout).toHaveBeenCalledWith(30_000, expect.any(Function));
  });

  test('rejects when the response exceeds the size cap', async () => {
    const req = fakeRequest();
    mockRegistryGet(req, (response) => {
      response.write(Buffer.alloc(17 * 1024 * 1024, 65)); // 17 MB > 16 MB cap
      response.end();
    });

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await expect((watcher as unknown as NpmWatcherTestAccess).fetchRegistry('lodash')).rejects.toThrow(/exceeded/);
  });

  test('rejects when the request times out', async () => {
    const req = fakeRequest();
    mockRegistryGet(req);
    process.nextTick(() => req._timeoutCb?.());

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await expect((watcher as unknown as NpmWatcherTestAccess).fetchRegistry('lodash')).rejects.toThrow(/timed out/);
  });
});
