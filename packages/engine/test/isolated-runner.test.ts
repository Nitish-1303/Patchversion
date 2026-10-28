import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { IsolatedRunner, isSecretOrExcluded } from '../src/sandbox/isolated-runner';

describe('IsolatedRunner - Safe Sandbox Isolation & Security Boundaries', () => {
  let runner: IsolatedRunner;
  let tmpSourceDir: string;

  beforeEach(() => {
    runner = new IsolatedRunner({ maxExecutionTimeMs: 3000, maxMemoryMb: 256 });
    tmpSourceDir = path.join(os.tmpdir(), `source-repo-${crypto.randomBytes(6).toString('hex')}`);
    fs.mkdirSync(tmpSourceDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpSourceDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  });

  test('secret exclusion identifies all sensitive credential and config patterns', () => {
    expect(isSecretOrExcluded('.env')).toBe(true);
    expect(isSecretOrExcluded('.env.production')).toBe(true);
    expect(isSecretOrExcluded('.git')).toBe(true);
    expect(isSecretOrExcluded('id_rsa')).toBe(true);
    expect(isSecretOrExcluded('id_ed25519')).toBe(true);
    expect(isSecretOrExcluded('server.key')).toBe(true);
    expect(isSecretOrExcluded('cert.pem')).toBe(true);
    expect(isSecretOrExcluded('credentials.json')).toBe(true);
    expect(isSecretOrExcluded('github_token.txt')).toBe(true);

    // Normal files must not be excluded
    expect(isSecretOrExcluded('package.json')).toBe(false);
    expect(isSecretOrExcluded('index.js')).toBe(false);
    expect(isSecretOrExcluded('README.md')).toBe(false);
  });

  test('isolated workspace never copies secret-bearing files into the sandbox', () => {
    // Populate source directory with legitimate code and sensitive files
    fs.writeFileSync(path.join(tmpSourceDir, 'package.json'), JSON.stringify({ name: 'safe-app' }));
    fs.writeFileSync(path.join(tmpSourceDir, 'index.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(tmpSourceDir, '.env'), 'AWS_SECRET_KEY=leak');
    fs.writeFileSync(path.join(tmpSourceDir, 'credentials.json'), '{"token": "xyz"}');

    const workDir = runner.createIsolatedWorkspace(tmpSourceDir);
    try {
      expect(fs.existsSync(path.join(workDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(workDir, 'index.js'))).toBe(true);

      // Sensitive files must NOT exist in the sandbox
      expect(fs.existsSync(path.join(workDir, '.env'))).toBe(false);
      expect(fs.existsSync(path.join(workDir, 'credentials.json'))).toBe(false);
    } finally {
      runner.cleanupWorkspace(workDir);
      expect(fs.existsSync(workDir)).toBe(false);
    }
  });

  test('environment scrubber removes host tokens and cloud credentials', () => {
    process.env.TEST_GITHUB_TOKEN = 'ghp_secret123';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-secret';
    process.env.AWS_SECRET_ACCESS_KEY = 'aws-secret';

    const cleanEnv = runner.getSanitizedEnv();

    expect(cleanEnv.TEST_GITHUB_TOKEN).toBeUndefined();
    expect(cleanEnv.ANTHROPIC_API_KEY).toBeUndefined();
    expect(cleanEnv.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    expect(cleanEnv.NODE_ENV).toBe('test');
    expect(cleanEnv.CI).toBe('true');
  });

  test('patch application strictly blocks directory traversal attempts', () => {
    const maliciousDiff = [
      '--- a/../../../../etc/passwd',
      '+++ b/../../../../etc/passwd',
      '@@ -1,1 +1,1 @@',
      '-root:x:0:0',
      '+hacked:x:0:0',
    ].join('\n');

    const res = runner.applyUnifiedDiff(tmpSourceDir, maliciousDiff);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/path traversal/i);
  });
});
