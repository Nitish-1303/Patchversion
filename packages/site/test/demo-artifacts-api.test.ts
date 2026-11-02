/**
 * @jest-environment node
 */
import { GET } from '../src/app/api/dashboard/demo-evidence/route';
import { NextRequest } from 'next/server';
import fs from 'fs';

describe('GET /api/dashboard/demo-evidence Public Endpoint', () => {
  test('1. Returns valid proof data for lodash fixture by default with public cache headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/dashboard/demo-evidence?run=lodash');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('public');
    const data = await res.json();

    expect(data.status).toBe('ready');
    expect(data.config.packageName).toBe('lodash');
    expect(data.config.fromVersion).toBe('3.10.1');
    expect(data.config.toVersion).toBe('4.17.21');
    expect(data.config.isRealPackage).toBe(true);

    // Evidence checks
    expect(data.evidence.proof).not.toBeNull();
    expect(data.evidence.proof.baselineResult.exitCode).toBe(0);
    expect(data.evidence.proof.redResult.exitCode).toBe(1);
    expect(data.evidence.proof.greenResult.exitCode).toBe(0);
    expect(typeof data.evidence.preparedPr).toBe('string');
    expect(data.evidence.preparedPr).toContain('Fix: lodash 3.10.1 -> 4.17.21');

    // Readiness audit
    expect(data.readiness.proofArtifactPresent).toBe(true);
    expect(data.readiness.proofArtifactValid).toBe(true);
    expect(data.readiness.preparedPrPresent).toBe(true);
    expect(data.readiness.testResultDataPresent).toBe(true);
    expect(data.readiness.sourceDiffPresent).toBe(true);
    expect(data.readiness.overallStatus).toBe('passed');
  });

  test('2. Returns valid proof data for mockpay fixture when requested', async () => {
    const req = new NextRequest('http://localhost:3000/api/dashboard/demo-evidence?run=mockpay');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.status).toBe('ready');
    expect(data.config.packageName).toBe('mockpay');
    expect(data.config.fromVersion).toBe('1.0.0');
    expect(data.config.toVersion).toBe('2.0.0');
    expect(data.config.isRealPackage).toBe(false);

    expect(data.evidence.proof.baselineResult.exitCode).toBe(0);
    expect(data.evidence.proof.redResult.exitCode).toBe(1);
    expect(data.evidence.proof.greenResult.exitCode).toBe(0);
    expect(data.readiness.overallStatus).toBe('passed');
  });

  test('3. Rejects path traversal attempts with HTTP 400 Bad Request', async () => {
    const maliciousKeys = [
      '../../etc/passwd',
      '..\\..\\windows\\win.ini',
      '../runs/latest',
      '/etc/shadow',
      'arbitrary-package',
    ];

    for (const key of maliciousKeys) {
      const req = new NextRequest(`http://localhost:3000/api/dashboard/demo-evidence?run=${encodeURIComponent(key)}`);
      const res = await GET(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid run key');
    }
  });

  test('4. Gracefully falls back to verified bundled artifacts when filesystem is absent (e.g. Vercel runtime)', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation(() => false);

    try {
      const req = new NextRequest('http://localhost:3000/api/dashboard/demo-evidence?run=lodash');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ready');
      expect(data.readiness.proofArtifactPresent).toBe(true);
      expect(data.readiness.overallStatus).toBe('passed');
      expect(data.evidence.proof).not.toBeNull();
    } finally {
      jest.restoreAllMocks();
    }
  });

  test('5. Gracefully handles malformed JSON in disk proof with "malformed" status when disk read breaks', async () => {
    const originalRead = fs.readFileSync;
    const originalExists = fs.existsSync;
    jest.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      if (p.toString().endsWith('proof.json')) return true;
      return originalExists(p);
    });
    jest.spyOn(fs, 'readFileSync').mockImplementation((p: fs.PathOrFileDescriptor, opt?: Parameters<typeof fs.readFileSync>[1]) => {
      const pStr = p.toString();
      if (pStr.endsWith('proof.json')) return '{ broken json:';
      return originalRead(p, opt);
    });

    try {
      const req = new NextRequest('http://localhost:3000/api/dashboard/demo-evidence?run=lodash');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('malformed');
      expect(data.readiness.proofArtifactValid).toBe(false);
      expect(data.readiness.overallStatus).toBe('incomplete');
      expect(data.readiness.errors).toEqual(expect.arrayContaining([expect.stringContaining('proof.json on disk is malformed')]));
    } finally {
      jest.restoreAllMocks();
    }
  });
});
