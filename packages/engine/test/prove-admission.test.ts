import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import { main } from '../src/prove';
import { resolveTrustedFixture } from '../src/fixture-admission';

jest.mock('child_process', () => ({ execFileSync: jest.fn() }));

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'patchversion-admission-'));
const fixtures = path.resolve(__dirname, '../../../fixtures');
const directoryLinkType: 'dir' | 'junction' = process.platform === 'win32' ? 'junction' : 'dir';

function createDirectoryLink(target: string, alias: string): () => void {
  try {
    fs.symlinkSync(target, alias, directoryLinkType);
    return () => fs.unlinkSync(alias);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? (error as NodeJS.ErrnoException).code
      : undefined;
    if (process.platform !== 'win32' || (code !== 'EPERM' && code !== 'EACCES')) throw error;

    // Windows may deny junction creation in restricted environments. Keep
    // the path-resolution assertion meaningful here; Linux CI exercises the
    // same cases with actual filesystem links.
    const canonicalTarget = fs.realpathSync(target);
    const canonicalAlias = path.resolve(alias);
    const realpath = fs.realpathSync.bind(fs) as (candidate: fs.PathLike) => string;
    jest.spyOn(fs, 'realpathSync').mockImplementation(((candidate: fs.PathLike) => (
      path.resolve(String(candidate)) === canonicalAlias ? canonicalTarget : realpath(candidate)
    )) as typeof fs.realpathSync);
    return () => jest.restoreAllMocks();
  }
}

afterAll(() => fs.rmSync(root, { recursive: true, force: true }));
afterEach(() => jest.restoreAllMocks());

describe('prove CLI admission before target operations', () => {
  test.each(['outside', 'fixtures-lookalike', 'missing'])(
    'rejects %s before reading a package or installing dependencies', async name => {
      const target = path.join(root, name);
      if (name !== 'missing') fs.mkdirSync(target);
      const read = jest.spyOn(fs, 'readFileSync');
      (execFileSync as jest.Mock).mockClear();
      await expect(main(target)).rejects.toThrow('not a trusted fixture');
      expect(read.mock.calls.filter(([file]) => String(file).startsWith(target))).toHaveLength(0);
      expect(execFileSync).not.toHaveBeenCalled();
    },
  );

  test('rejects a symlink from fixtures to an outside directory before install', async () => {
    const link = path.join(fixtures, `.admission-test-${process.pid}`);
    const removeLink = createDirectoryLink(root, link);
    try {
      const read = jest.spyOn(fs, 'readFileSync');
      (execFileSync as jest.Mock).mockClear();
      await expect(main(link)).rejects.toThrow('not a trusted fixture');
      expect(read.mock.calls.filter(([file]) => String(file).startsWith(link) || String(file).startsWith(root))).toHaveLength(0);
      expect(execFileSync).not.toHaveBeenCalled();
    } finally {
      removeLink();
    }
  });

  test('canonicalizes an alias to a bundled fixture and admits both supported fixtures', () => {
    const sample = path.join(fixtures, 'sample-repo');
    const alias = path.join(root, 'sample-alias');
    const removeAlias = createDirectoryLink(sample, alias);
    try {
      expect(resolveTrustedFixture(alias, [fixtures])).toBe(fs.realpathSync(sample));
      expect(resolveTrustedFixture(path.join(fixtures, 'lodash-repo'), [fixtures]))
        .toBe(fs.realpathSync(path.join(fixtures, 'lodash-repo')));
    } finally {
      removeAlias();
    }
  });

  test('rejects sibling-prefix paths and missing trusted roots', () => {
    const trusted = path.join(root, 'trusted');
    const sibling = path.join(root, 'trusted-other');
    fs.mkdirSync(trusted);
    fs.mkdirSync(sibling);
    expect(resolveTrustedFixture(sibling, [trusted])).toBeNull();
    expect(resolveTrustedFixture(trusted, [path.join(root, 'absent')])).toBeNull();
  });
});
