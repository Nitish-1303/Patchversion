/**
 * Regression: webhook body-size limit (2026-10-24 review).
 *
 * The limit must be enforced on raw bytes (not string characters), must
 * catch a single oversized chunk and chunks that cross the limit, must
 * allow a body of exactly 1 MB, and must reject oversized bodies with
 * 413 BEFORE signature verification or event processing.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import crypto from 'crypto';
import { AddressInfo } from 'net';
import { WebhookReceiver } from '../src/webhook-receiver';
import { PatchversionEngine } from '../src/engine';

jest.setTimeout(30_000);

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-bodylimit-'));
const MAX = 1024 * 1024;
const SECRET = 'body-limit-test-secret';

afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

function makeReceiver(name: string): WebhookReceiver {
  const engine = new PatchversionEngine({
    stateDir: path.join(tmpRoot, name),
    sandboxMode: 'local',
    requireIsolation: false,
  });
  return new WebhookReceiver(engine, SECRET);
}

function startReceiver(receiver: WebhookReceiver): number {
  receiver.start(0);
  const server = (receiver as unknown as { server: http.Server }).server;
  return (server.address() as AddressInfo).port;
}

function sign(body: string | Buffer): string {
  return 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

/** POST a body as explicit chunks; resolves with the HTTP status. */
function postChunks(port: number, chunks: (string | Buffer)[], signature?: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const total = chunks.reduce((n, c) => n + (typeof c === 'string' ? Buffer.byteLength(c) : c.length), 0);
    const req = http.request(
      {
        port,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-github-event': 'push',
          ...(signature ? { 'x-hub-signature-256': signature } : {}),
        },
      },
      res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode ?? 0));
      },
    );
    req.on('error', reject);
    req.setHeader('content-length', total);
    for (const c of chunks) req.write(c);
    req.end();
  });
}

describe('webhook body-size limit', () => {
  it('a single oversized chunk is rejected with 413', async () => {
    const receiver = makeReceiver('single');
    const port = startReceiver(receiver);
    try {
      const body = Buffer.alloc(MAX + 1, 'x');
      expect(await postChunks(port, [body])).toBe(413);
    } finally {
      receiver.stop();
    }
  });

  it('multiple chunks that cross the limit mid-stream are rejected with 413', async () => {
    const receiver = makeReceiver('multi');
    const port = startReceiver(receiver);
    try {
      // 4 x 300 KB = 1.2 MB; no single chunk is oversized and the limit is
      // only crossed when the final chunk arrives.
      const chunk = Buffer.alloc(300 * 1024, 'x');
      expect(await postChunks(port, [chunk, chunk, chunk, chunk])).toBe(413);
    } finally {
      receiver.stop();
    }
  });

  it('oversized body is rejected with 413 even before signature verification', async () => {
    const receiver = makeReceiver('ordering');
    const port = startReceiver(receiver);
    try {
      const body = Buffer.alloc(MAX + 1, 'x');
      // A deliberately INVALID signature must still yield 413, not 401:
      // size enforcement runs before signature verification.
      expect(await postChunks(port, [body], 'sha256=deadbeef')).toBe(413);
    } finally {
      receiver.stop();
    }
  });

  it('a body of exactly 1 MB is accepted', async () => {
    const receiver = makeReceiver('exact');
    const port = startReceiver(receiver);
    try {
      // Build valid JSON of exactly MAX bytes (all ASCII: 1 char = 1 byte).
      const pad = MAX - '{"pad":"x"}'.length;
      const body = '{"pad":"x' + 'y'.repeat(pad) + '"}';
      expect(Buffer.byteLength(body)).toBe(MAX);
      expect(await postChunks(port, [body], sign(body))).toBe(200);
    } finally {
      receiver.stop();
    }
  });

  it('multibyte UTF-8 counts bytes, not characters', async () => {
    const receiver = makeReceiver('utf8');
    const port = startReceiver(receiver);
    try {
      // 400,000 euro signs = 400,000 string characters but 1,200,000 bytes.
      // A character-counted limit would accept this; a byte limit rejects it.
      const body = '\u20AC'.repeat(400_000);
      expect(body.length).toBe(400_000);
      expect(Buffer.byteLength(body)).toBe(1_200_000);
      expect(await postChunks(port, [body])).toBe(413);
    } finally {
      receiver.stop();
    }
  });
});
