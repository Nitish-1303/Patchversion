import {
  ChangeRecord,
  ImpactAnalysis,
  ProofArtifact,
  PreparedPR,
  CallSite,
  UnverifiableSite,
} from '@patchversion/shared';
import { StateStore } from '../state/store';

/**
 * PR Bot: prepares local text artifacts for a proposed pull request.
 *
 * Every PR carries:
 * - What changed upstream (with source link)
 * - Affected call sites
 * - The fix diff
 * - Red-to-green proof artifact (designed for 60-second review)
 * - Coverage honesty block: "verified N of M; these K unverifiable"
 * - Confidence and what was NOT verified
 *
 * Nothing is submitted to GitHub, and superseded PRs are not closed.
 */
export class PRBot {
  private store: StateStore;

  constructor(store: StateStore) {
    this.store = store;
  }

  /**
   * Prepare a PR from a verified proof.
   * Returns the PreparedPR artifact only; it does not call the GitHub API.
   */
  preparePR(
    change: ChangeRecord,
    impact: ImpactAnalysis,
    proof: ProofArtifact,
  ): PreparedPR {
    const title = this.buildTitle(change, impact);
    const body = this.buildBody(change, impact, proof);
    const branch = this.buildBranchName(change);

    const pr: PreparedPR = {
      title,
      body,
      branch,
      proofArtifact: proof,
      change,
      impact,
    };

    this.store.savePR(pr);
    return pr;
  }

  /**
   * Prepare an honest "needs human" issue for unfixable breaks.
   * This is NOT a PR - it's an issue with evidence.
   */
  prepareUnfixableIssue(
    change: ChangeRecord,
    impact: ImpactAnalysis,
    reason: string,
  ): { title: string; body: string } {
    const title = `[Patchversion] ${change.packageName}@${change.toVersion} may break your code - needs human review`;

    const body = [
      `**Not submitted to GitHub. Prepared issue text only.**`,
      ``,
      `## Breaking change detected`,
      ``,
      `**Package:** ${change.packageName}`,
      `**From:** ${change.fromVersion} -> **To:** ${change.toVersion}`,
      `**Source:** [${change.source}](${change.sourceUrl})`,
      `**Detected:** ${change.detectedAt}`,
      ``,
      `### Why this needs human review`,
      ``,
      reason,
      ``,
      `### Affected call sites (${impact.affectedCallSites.length})`,
      ``,
      ...impact.affectedCallSites.map((site: CallSite) =>
        `- \`${site.filePath}:${site.line}\` - \`${site.callExpression.slice(0, 80)}\``
      ),
      ``,
      `### What Patchversion could NOT verify`,
      ``,
      `An automatic fix was attempted but did not pass the test suite.`,
      `The break is real but the fix requires human judgment.`,
      ``,
      `---`,
      `*Prepared by Patchversion. Not submitted to GitHub. This is a report, not a fix.*`,
    ].join('\n');

    this.store.logEvent('unfixable_issue_prepared', {
      changeId: change.id,
      packageName: change.packageName,
      affectedSites: impact.affectedCallSites.length,
    });

    return { title, body };
  }

  private buildTitle(change: ChangeRecord, impact: ImpactAnalysis): string {
    return `[Patchversion] Fix: ${change.packageName} ${change.fromVersion} -> ${change.toVersion} (${impact.affectedCallSites.length} call site${impact.affectedCallSites.length !== 1 ? 's' : ''})`;
  }

  private buildBody(change: ChangeRecord, impact: ImpactAnalysis, proof: ProofArtifact): string {
    const coverageLine = proof.coverageVerified === proof.coverageTotal
      ? `The fix updated all ${proof.coverageTotal} affected call sites, and the full test suite is green after the fix.`
      : `The fix updated ${proof.coverageVerified} of ${proof.coverageTotal} affected call sites. ${proof.unverifiable.length} could not be verified (see below).`;

    // Count only the call sites the applied fix actually changed
    const fixedSites = impact.affectedCallSites.filter(site =>
      proof.fixedFiles.includes(site.filePath),
    );

    // A caller-supplied or persisted label is not evidence of isolation.
    // Only the local execution path is currently implemented and supported.
    const isLocalProcess = proof.sandboxType === 'local-process';
    const sandboxLine = isLocalProcess
      ? `This fix was verified in a local process (no isolation) before this PR text was prepared.`
      : `Execution environment is unsupported or unknown; isolation has not been verified.`;

    const sections: string[] = [
      `**Not submitted to GitHub. Prepared PR text only.**`,
      ``,
      `## What changed`,
      ``,
      `**${change.packageName}** released **${change.toVersion}** (from ${change.fromVersion}).`,
      ``,
      `> ${change.rawNotes.slice(0, 500)}`,
      ``,
      `[View release](${change.sourceUrl})`,
      ``,
      `## What this PR does`,
      ``,
      `Updates ${fixedSites.length} call site${fixedSites.length !== 1 ? 's' : ''} to work with ${change.packageName}@${change.toVersion}.`,
      ``,
      `### Changed files`,
      ``,
      ...proof.fixedFiles.map(file => {
        const count = fixedSites.filter(site => site.filePath === file).length;
        return `- \`${file}\` (${count} call site${count !== 1 ? 's' : ''} updated)`;
      }),
      ``,
      `## Proof`,
      ``,
      sandboxLine,
      ``,
      `| Step | Result |`,
      `|------|--------|`,
      `| Tests on ${change.fromVersion} (baseline) | ${proof.baselineResult.passed}/${proof.baselineResult.total} passed |`,
      `| Tests on ${change.toVersion} (before fix) | ${proof.redResult.passed}/${proof.redResult.total} passed, ${proof.redResult.failed} failed |`,
      `| Tests on ${change.toVersion} (after fix) | ${proof.greenResult.passed}/${proof.greenResult.total} passed, ${proof.greenResult.failed} failed |`,
      ``,
      coverageLine,
      ``,
    ];

    // Coverage honesty block
    if (proof.unverifiable.length > 0) {
      sections.push(
        `### Not verified`,
        ``,
        `The following call sites could not be verified by the test suite:`,
        ``,
        ...proof.unverifiable.map((u: UnverifiableSite) =>
          `- \`${u.callSite.filePath}:${u.callSite.line}\` - ${u.reason}`
        ),
        ``,
      );
    }

    // What was NOT verified
    sections.push(
      `### Confidence`,
      ``,
      `- Change classification confidence: ${(change.classification.confidence * 100).toFixed(0)}%`,
      `- Sandbox type: ${isLocalProcess ? 'local-process' : 'unsupported or unknown (not verified)'}`,
      `- Proof generated: ${proof.producedAt}`,
      ``,
      `---`,
      isLocalProcess
        ? `*Prepared by Patchversion. Not submitted to GitHub. Proof recorded from local execution.*`
        : `*Prepared by Patchversion. Not submitted to GitHub. Execution environment not verified.*`,
    );

    return sections.join('\n');
  }

  private buildBranchName(change: ChangeRecord): string {
    const safeName = change.packageName.replace(/[^a-zA-Z0-9-]/g, '-');
    return `patchversion/${safeName}-${change.toVersion}`;
  }

}
