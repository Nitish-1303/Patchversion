import { classifyChange } from '../src/break-detector/classifier';

describe('classifyChange', () => {
  it('detects major version bump as breaking', () => {
    const result = classifyChange('stripe', '10.0.0', '11.0.0', '');
    expect(result.isBreaking).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('detects breaking keywords in release notes', () => {
    const result = classifyChange('pkg', '1.0.0', '1.1.0', 'BREAKING CHANGE: removed the old API');
    expect(result.isBreaking).toBe(true);
  });

  it('does not flag feature-only releases', () => {
    const result = classifyChange('pkg', '1.0.0', '1.1.0', 'Added new feature for batch processing');
    expect(result.isBreaking).toBe(false);
  });

  it('handles deprecation notices', () => {
    const result = classifyChange('pkg', '1.0.0', '1.1.0', 'The create() method is deprecated, use createV2()');
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it('extracts affected exports from notes', () => {
    const result = classifyChange('pkg', '1.0.0', '2.0.0', 'BREAKING: renamed source to payment_method');
    expect(result.affectedExports).toBeDefined();
  });

  it('handles empty notes with low confidence', () => {
    const result = classifyChange('pkg', '1.0.0', '1.0.1', '');
    expect(result.confidence).toBeLessThan(0.5);
  });
});
