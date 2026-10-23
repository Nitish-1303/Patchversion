import { ChangeRecord, UsageMap, ImpactAnalysis, CallSite } from '@patchversion/shared';

/**
 * Intersect a detected change with a repo's usage map to find
 * exactly which call sites are affected.
 *
 * Sites are split into two honest buckets:
 * - affected: intersect the specific change (renamed export, changed endpoint)
 * - potential: use the package but match only the broad "major version" fallback;
 *   reported as not individually verified rather than counted as covered
 */
export function analyzeImpact(change: ChangeRecord, usageMap: UsageMap): ImpactAnalysis {
  const affected: CallSite[] = [];
  const potential: CallSite[] = [];
  const unaffected: CallSite[] = [];

  for (const site of usageMap.callSites) {
    if (isDirectlyAffected(site, change)) {
      affected.push(site);
    } else if (isPotentiallyAffected(site, change)) {
      potential.push(site);
    } else {
      unaffected.push(site);
    }
  }

  return {
    changeId: change.id,
    repoId: usageMap.repoId,
    affectedCallSites: affected,
    unaffectedCallSites: unaffected,
    potentialCallSites: potential,
    coveragePercent: usageMap.callSites.length > 0
      ? (affected.length / usageMap.callSites.length) * 100
      : 0,
    analyzedAt: new Date().toISOString(),
  };
}

function isDirectlyAffected(site: CallSite, change: ChangeRecord): boolean {
  // If the classifier identified affected exports, check both the
  // exported symbol AND the call expression text for matches.
  // A renamed parameter (e.g., 'source' -> 'payment_method') appears
  // in the call expression, not necessarily in the exported symbol.
  if (change.classification.affectedExports && change.classification.affectedExports.length > 0) {
    const matchesExport = change.classification.affectedExports.some((exp: string) =>
      site.exportedSymbol.toLowerCase().includes(exp.toLowerCase()) ||
      exp.toLowerCase().includes(site.exportedSymbol.toLowerCase())
    );
    const matchesCallText = change.classification.affectedExports.some((exp: string) =>
      site.callExpression.toLowerCase().includes(exp.toLowerCase())
    );
    if (matchesExport || matchesCallText) return true;
  }

  // If the classifier identified affected endpoints, check the call expression
  if (change.classification.affectedEndpoints && change.classification.affectedEndpoints.length > 0) {
    return change.classification.affectedEndpoints.some((ep: string) =>
      site.callExpression.includes(ep)
    );
  }

  return false;
}

function isPotentiallyAffected(site: CallSite, change: ChangeRecord): boolean {
  // For breaking major version bumps with no specific intersection,
  // all other call sites using the package are potentially affected.
  // They are reported honestly as not individually verified.
  if (change.classification.isBreaking && change.severity === 'breaking') {
    return site.packageName === change.packageName;
  }
  return false;
}
