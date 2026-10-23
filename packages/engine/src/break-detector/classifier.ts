import { ChangeClassification } from '@patchversion/shared';
import semver from 'semver';

/** Patterns that indicate a breaking change in release notes. */
const BREAKING_PATTERNS = [
  /breaking\s*change/i,
  /breaking/i,
  /removed?\s+(?:the\s+)?(?:method|function|api|endpoint|field|property|parameter)/i,
  /renamed?\s+(?:from|to)\s/i,
  /deprecated/i,
  /no\s+longer\s+support/i,
  /dropped?\s+support/i,
  /migration\s+required/i,
  /major\s+version/i,
  /\bBREAKING\b/,
  /requires?\s+(?:code\s+)?changes/i,
];

/** Patterns that indicate a feature addition (not breaking). */
const FEATURE_PATTERNS = [
  /added?\s+(?:support|new|method|feature|endpoint)/i,
  /introduced/i,
  /new\s+feature/i,
];

/**
 * Classify whether a version bump constitutes a breaking change.
 * Uses semver semantics + release note analysis.
 */
export function classifyChange(
  packageName: string,
  fromVersion: string,
  toVersion: string,
  releaseNotes: string,
): ChangeClassification {
  // Semver analysis
  let semverBreaking = false;
  if (semver.valid(fromVersion) && semver.valid(toVersion)) {
    const fromMajor = semver.major(fromVersion);
    const toMajor = semver.major(toVersion);
    semverBreaking = toMajor > fromMajor;
  }

  // Release note analysis
  const breakingHits = BREAKING_PATTERNS.filter(p => p.test(releaseNotes)).length;
  const featureHits = FEATURE_PATTERNS.filter(p => p.test(releaseNotes)).length;

  // Deprecation is breaking-adjacent: it means the old way will stop working
  const hasDeprecation = /deprecated/i.test(releaseNotes);

  const isBreaking = semverBreaking || breakingHits > 0;
  const confidence = computeConfidence(semverBreaking, breakingHits, featureHits, hasDeprecation, releaseNotes);

  const affectedEndpoints = extractAffectedEndpoints(releaseNotes);
  const affectedExports = extractAffectedExports(releaseNotes);

  return {
    isBreaking,
    confidence,
    affectedEndpoints,
    affectedExports,
    reason: buildReason(semverBreaking, breakingHits, featureHits, hasDeprecation, fromVersion, toVersion),
  };
}

function computeConfidence(
  semverBreaking: boolean,
  breakingHits: number,
  featureHits: number,
  hasDeprecation: boolean,
  notes: string,
): number {
  let score = 0.5; // baseline uncertainty

  if (semverBreaking) score += 0.3;
  if (breakingHits > 0) score += 0.15 * Math.min(breakingHits, 3);
  if (hasDeprecation) score += 0.1;
  if (featureHits > breakingHits) score -= 0.2;
  if (notes.length < 20) score -= 0.2; // very sparse notes = low confidence

  return Math.max(0, Math.min(1, score));
}

function extractAffectedEndpoints(notes: string): string[] {
  const endpointPattern = /(?:endpoint|route|path|url)\s+[`'"]?([/\w-]+(?:\/[/\w-]*)*)[`'"]?/gi;
  const matches = new Set<string>();
  let match;
  while ((match = endpointPattern.exec(notes)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function extractAffectedExports(notes: string): string[] {
  const exportPattern = /(?:removed?|renamed?|changed)\s+[`'"]?(\w+)[`'"]?/gi;
  const matches = new Set<string>();
  let match;
  while ((match = exportPattern.exec(notes)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

function buildReason(
  semverBreaking: boolean,
  breakingHits: number,
  featureHits: number,
  hasDeprecation: boolean,
  from: string,
  to: string,
): string {
  const parts: string[] = [];
  if (semverBreaking) parts.push(`major version bump ${from} -> ${to}`);
  if (breakingHits > 0) parts.push(`${breakingHits} breaking-change indicator(s) in release notes`);
  if (hasDeprecation) parts.push('deprecation notices present');
  if (featureHits > 0 && breakingHits === 0) parts.push('appears feature-only');
  if (parts.length === 0) parts.push('no clear breaking indicators');
  return parts.join('; ');
}
