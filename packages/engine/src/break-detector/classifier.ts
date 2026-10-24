import { ChangeClassification } from '@patchversion/shared';
import semver from 'semver';

/**
 * Patterns that indicate a breaking change in release notes.
 * Deprecation alone is NOT breaking (the old way still works), so it is
 * deliberately absent here and only nudges confidence below.
 */
const BREAKING_PATTERNS = [
  /breaking\s*change/i,
  /\bBREAKING\b/,
  /removed?\s+(?:the\s+)?(?:method|function|api|endpoint|field|property|parameter)/i,
  /renamed?\s+(?:from\s+)?[`'"]?[\w.]+\s+[`'"]?\s+to\s/i,
  /no\s+longer\s+support/i,
  /dropped?\s+support/i,
  /migration\s+required/i,
  /requires?\s+(?:code\s+)?changes/i,
];

/** Negation contexts that cancel a bare "breaking" mention. */
const NEGATION_PATTERNS = [
  /no[tn][-\s]breaking/i,
  /no\s+breaking\s+changes?/i,
  /without\s+(?:any\s+)?breaking/i,
  /not\s+a\s+breaking/i,
];

/** Patterns that indicate a feature addition (not breaking). */
const FEATURE_PATTERNS = [
  /added?\s+(?:support|new|method|feature|endpoint)/i,
  /introduced/i,
  /new\s+feature/i,
];

/** Words that look like identifiers to a naive extractor but are prose. */
const STOPWORDS = new Set([
  'to', 'from', 'the', 'a', 'an', 'old', 'new', 'its', 'their',
  'method', 'function', 'api', 'endpoint', 'field', 'property', 'parameter',
  'support', 'version', 'behavior', 'behaviour',
]);

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

  // Release note analysis. A negated mention ("no breaking changes",
  // "non-breaking") cancels keyword hits instead of causing a false positive.
  const negated = NEGATION_PATTERNS.some(p => p.test(releaseNotes));
  const breakingHits = negated ? 0 : BREAKING_PATTERNS.filter(p => p.test(releaseNotes)).length;
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
    reason: buildReason(semverBreaking, breakingHits, featureHits, hasDeprecation, negated, fromVersion, toVersion),
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
    if (!STOPWORDS.has(match[1].toLowerCase())) {
      matches.add(match[1]);
    }
  }
  return Array.from(matches);
}

function extractAffectedExports(notes: string): string[] {
  const matches = new Set<string>();

  // Passive rename: "the 'source' parameter ... has been renamed to 'payment_method'"
  const passive = /[`'"]([\w.]+)[`'"][^`'"]{0,80}?(?:has been|was)\s+renamed\s+to\s+[`'"]([\w.]+)[`'"]/gi;
  let pm;
  while ((pm = passive.exec(notes)) !== null) {
    const oldName = lastSegment(pm[1]);
    if (!STOPWORDS.has(oldName.toLowerCase())) matches.add(oldName);
  }

  // Prefer quoted identifiers: removed `foo`, renamed `_.contains` to ...
  const quoted = /(?:removed?|renamed?|changed)\s+(?:from\s+)?[`'"]([\w.]+)[`'"]/gi;
  let match;
  while ((match = quoted.exec(notes)) !== null) {
    const name = lastSegment(match[1]);
    if (!STOPWORDS.has(name.toLowerCase())) matches.add(name);
  }
  if (matches.size > 0) return Array.from(matches);

  // Fall back to bare words, stopword-filtered to avoid capturing prose
  // like "to" (from "renamed to X") or "the".
  const bare = /(?:removed?|renamed?|changed)\s+(?!from\s|to\s)[`'"]?(\w+)[`'"]?/gi;
  while ((match = bare.exec(notes)) !== null) {
    const name = lastSegment(match[1]);
    if (!STOPWORDS.has(name.toLowerCase())) matches.add(name);
  }
  return Array.from(matches);
}

/** "_.contains" -> "contains"; "charges.create" -> "create". */
function lastSegment(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1) : name;
}

function buildReason(
  semverBreaking: boolean,
  breakingHits: number,
  featureHits: number,
  hasDeprecation: boolean,
  negated: boolean,
  from: string,
  to: string,
): string {
  const parts: string[] = [];
  if (semverBreaking) parts.push(`major version bump ${from} -> ${to}`);
  if (breakingHits > 0) parts.push(`${breakingHits} breaking-change indicator(s) in release notes`);
  if (negated) parts.push('notes explicitly say non-breaking');
  if (hasDeprecation) parts.push('deprecation notices present');
  if (featureHits > 0 && breakingHits === 0) parts.push('appears feature-only');
  if (parts.length === 0) parts.push('no clear breaking indicators');
  return parts.join('; ');
}
