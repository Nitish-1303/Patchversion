import fs from 'fs';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { NpmWatcher } from '../src/watcher/npm-watcher';
import { StateStore } from '../src/state/store';

function tmpStore(): { store: StateStore; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-test-'));
  return { store: new StateStore(dir), dir };
}

describe('NpmWatcher poll overlap guard', () => {
  test('a second poll while one is in flight is skipped and logged', async () => {
    const { store } = tmpStore();
    const watcher = new NpmWatcher(store, 60_000);

    const hanging = new Promise<never>(() => {});
    const spy = jest
      .spyOn(watcher as any, 'pollAllInner')
      .mockImplementationOnce(() => hanging)
      .mockImplementation(() => Promise.resolve([]));

    const first = watcher.pollAll(); // never settles
    const second = await watcher.pollAll();

    expect(second).toEqual([]);
    expect(spy).toHaveBeenCalledTimes(1); // inner not re-entered

    // The skip is visible in the event log
    const today = new Date().toISOString().slice(0, 10);
    const log = fs.readFileSync(
      path.join((store as any).stateDir, 'events', `${today}.jsonl`),
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

  function fakeRequest() {
    const req = new EventEmitter() as any;
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
    const https = require('https');
    const req = fakeRequest();
    jest.spyOn(https, 'get').mockImplementation((...args: any[]) => {
      const cb = args[1] as (res: any) => void;
      const res = new EventEmitter();
      cb(res);
      process.nextTick(() => {
        res.emit('data', Buffer.from('{}'));
        res.emit('end');
      });
      return req;
    });

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await (watcher as any).fetchRegistry('lodash');
    expect(req.setTimeout).toHaveBeenCalledWith(30_000, expect.any(Function));
  });

  test('rejects when the response exceeds the size cap', async () => {
    const https = require('https');
    const req = fakeRequest();
    jest.spyOn(https, 'get').mockImplementation((...args: any[]) => {
      const cb = args[1] as (res: any) => void;
      const res = new EventEmitter();
      cb(res);
      process.nextTick(() => {
        res.emit('data', Buffer.alloc(17 * 1024 * 1024, 65)); // 17 MB > 16 MB cap
        res.emit('end');
      });
      return req;
    });

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await expect((watcher as any).fetchRegistry('lodash')).rejects.toThrow(/exceeded/);
  });

  test('rejects when the request times out', async () => {
    const https = require('https');
    const req = fakeRequest();
    jest.spyOn(https, 'get').mockImplementation((..._args: any[]) => {
      process.nextTick(() => req._timeoutCb());
      return req;
    });

    const { store } = tmpStore();
    const watcher = new NpmWatcher(store);
    await expect((watcher as any).fetchRegistry('lodash')).rejects.toThrow(/timed out/);
  });
});
