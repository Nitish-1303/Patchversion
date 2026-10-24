/**
 * Regression: raw-byte webhook signature verification (2026-10-24 review).
 *
 * X-Hub-Signature-256 must be verified over the exact original request
 * bytes. Decoding each chunk with toString('utf8') before concatenation
 * corrupts multibyte characters split across chunks (replacement chars),
 * so a legitimately signed payload could fail verification - and any
 * re-encoding mismatch would go unnoticed. The body is now buffered as
 * raw Buffer chunks, the HMAC runs over those bytes, and decoding for
 * JSON.parse happens only after verification.
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

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-rawsig-'));
const MAX = 1024 * 1024;
const SECRET = 'raw-signature-test-secret';

afterAll(() => fs.rmSync(tmpRoot, { recursive: true, force: true }));

function makeReceiver(name: string): { receiver: WebhookReceiver; stateDir: string } {
  const stateDir = path.join(tmpRoot, name);
  const engine = new PatchversionEngine({
    stateDir,
    sandboxMode: 'local',
    requireIsolation: false,
  });
  return { receiver: new WebhookReceiver(engine, SECRET), stateDir };
}

function startReceiver(receiver: WebhookReceiver): number {
  receiver.start(0);
  const server = (receiver as unknown as { server: http.Server }).server;
  return (server.address() as AddressInfo).port;
}

function sign(bytes: Buffer): string {
  return 'sha256=' + crypto.createHmac('sha256', SECRET).update(bytes).digest('hex');
}

function postChunks(
  port: number,
  chunks: Buffer[],
  signature?: string,
  event = 'push',
): Promise<number> {
  return new Promise((resolve, reject) => {
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const req = http.request(
      {
        port,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-github-event': event,
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

/** Observable event processing: the engine's event journal on disk. */
function loggedEventTypes(stateDir: string): string[] {
  const dir = path.join(stateDir, 'events');
  if (!fs.existsSync(dir)) return [];
  const types: string[] = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      types.push(JSON.parse(line).type);
    }
  }
  return types;
}

describe('webhook raw-byte signature verification', () => {
  it('valid signature succeeds when a multibyte character is split across two chunks', async () => {
    const { receiver, stateDir } = makeReceiver('split');
    const port = startReceiver(receiver);
    try {
      const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main', note: 'EUR \u20AC ok' }), 'utf8');
      // Split INSIDE the 3-byte euro sign (0xE2 0x82 0xAC).
      const euro = body.indexOf(0xe2);
      expect(euro).toBeGreaterThan(0);
      expect(body[euro + 1]).toBe(0x82);
      const k = euro + 1; // mid-character boundary
      const status = await postChunks(port, [body.subarray(0, k), body.subarray(k)], sign(body));
      expect(status).toBe(200);
      // And it genuinely reached event processing.
      expect(loggedEventTypes(stateDir)).toContain('push');
    } finally {
      receiver.stop();
    }
  });

  it('a signature over altered bytes is rejected', async () => {
    const { receiver } = makeReceiver('altered');
    const port = startReceiver(receiver);
    try {
      const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }), 'utf8');
      const altered = Buffer.concat([body, Buffer.from(' ')]);
      expect(await postChunks(port, [body], sign(altered))).toBe(401);
    } finally {
      receiver.stop();
    }
  });

  it('a signature over re-encoded bytes is rejected', async () => {
    const { receiver } = makeReceiver('reencoded');
    const port = startReceiver(receiver);
    try {
      const text = JSON.stringify({ ref: 'refs/heads/main', note: 'EUR \u20AC ok' });
      const utf8Bytes = Buffer.from(text, 'utf8');
      const latin1Bytes = Buffer.from(text, 'latin1'); // different byte sequence
      expect(latin1Bytes.equals(utf8Bytes)).toBe(false);
      expect(await postChunks(port, [utf8Bytes], sign(latin1Bytes))).toBe(401);
    } finally {
      receiver.stop();
    }
  });

  it('missing and invalid signatures remain rejected', async () => {
    const { receiver } = makeReceiver('missing');
    const port = startReceiver(receiver);
    try {
      const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }), 'utf8');
      expect(await postChunks(port, [body])).toBe(401);
      expect(await postChunks(port, [body], 'sha256=deadbeef')).toBe(401);
    } finally {
      receiver.stop();
    }
  });

  it('oversized single-chunk and multi-chunk payloads are rejected with 413', async () => {
    const { receiver } = makeReceiver('oversize');
    const port = startReceiver(receiver);
    try {
      const big = Buffer.alloc(MAX + 1, 'x');
      expect(await postChunks(port, [big], sign(big))).toBe(413);
      const chunk = Buffer.alloc(300 * 1024, 'x');
      expect(await postChunks(port, [chunk, chunk, chunk, chunk])).toBe(413);
    } finally {
      receiver.stop();
    }
  });

  it('oversized requests never reach event processing', async () => {
    const { receiver, stateDir } = makeReceiver('noevents');
    const port = startReceiver(receiver);
    try {
      const big = Buffer.alloc(MAX + 1, 'x');
      expect(await postChunks(port, [big])).toBe(413);
      // No event may be journaled for the rejected request.
      expect(loggedEventTypes(stateDir)).toEqual([]);
    } finally {
      receiver.stop();
    }
  });

  it('a payload of exactly 1 MiB remains accepted when otherwise valid', async () => {
    const { receiver } = makeReceiver('exact');
    const port = startReceiver(receiver);
    try {
      const pad = MAX - '{"pad":"x"}'.length;
      const text = '{"pad":"x' + 'y'.repeat(pad) + '"}';
      const body = Buffer.from(text, 'utf8');
      expect(body.length).toBe(MAX);
      expect(await postChunks(port, [body], sign(body))).toBe(200);
    } finally {
      receiver.stop();
    }
  });
});
