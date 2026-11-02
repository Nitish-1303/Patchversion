import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  BUNDLED_LODASH_PROOF,
  BUNDLED_LODASH_PR,
  BUNDLED_LODASH_TRANSCRIPT,
  BUNDLED_LODASH_MANIFEST,
  BUNDLED_LODASH_SOURCE,
  BUNDLED_MOCKPAY_PROOF,
  BUNDLED_MOCKPAY_PR,
  BUNDLED_MOCKPAY_TRANSCRIPT,
  BUNDLED_MOCKPAY_SOURCE,
} from '../../../dashboard/data/bundled-artifacts';

export interface DemoRunConfig {
  key: string;
  title: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  isRealPackage: boolean;
  breakingApi: string;
  replacementApi: string;
  breakingDescription: string;
  artifactDirRel: string;
  sourceFileRel: string;
  sourceLine: number;
  originalCall: string;
  replacementCall: string;
  failureExplanation: string;
  reproductionCommand: string;
}

const ALLOWED_RUNS: Record<string, DemoRunConfig> = {
  lodash: {
    key: 'lodash',
    title: 'Lodash 3.10.1 → 4.17.21 (Real Package Migration)',
    packageName: 'lodash',
    fromVersion: '3.10.1',
    toVersion: '4.17.21',
    isRealPackage: true,
    breakingApi: '_.contains(collection, target)',
    replacementApi: '_.includes(collection, target)',
    breakingDescription:
      'In Lodash v4.0.0, the collection utility _.contains was completely removed in favor of _.includes. Calling _.contains throws a fatal TypeError at runtime.',
    artifactDirRel: 'runs/lodash-4-migration',
    sourceFileRel: 'fixtures/lodash-repo/src/membership.js',
    sourceLine: 6,
    originalCall: 'return _.contains(ids, id);',
    replacementCall: 'return _.includes(ids, id);',
    failureExplanation: 'TypeError: _.contains is not a function at isMember (src/membership.js:6:12)',
    reproductionCommand: 'npm run prove:real',
  },
  mockpay: {
    key: 'mockpay',
    title: 'Mockpay 1.0.0 → 2.0.0 (Synthetic Parameter Rename)',
    packageName: 'mockpay',
    fromVersion: '1.0.0',
    toVersion: '2.0.0',
    isRealPackage: false,
    breakingApi: 'charges.create({ source: ... })',
    replacementApi: 'charges.create({ payment_method: ... })',
    breakingDescription:
      "In Mockpay v2.0.0, the 'source' parameter was renamed to 'payment_method'. Passing 'source' is rejected by the SDK with an unrecognized parameter error.",
    artifactDirRel: 'runs/latest',
    sourceFileRel: 'fixtures/sample-repo/src/createCharge.js',
    sourceLine: 4,
    originalCall: 'source: paymentSource,',
    replacementCall: 'payment_method: paymentSource,',
    failureExplanation: "Error: parameter 'source' is no longer supported; use 'payment_method'",
    reproductionCommand: 'npm run prove',
  },
};

export function findRepoRoot(): string {
  let curr = process.cwd();
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'fixtures', 'lodash-repo'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  curr = __dirname;
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'fixtures', 'lodash-repo'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

export interface DemoArtifactResponse {
  status: 'ready' | 'missing' | 'malformed' | 'failed';
  config: DemoRunConfig;
  availableRuns: { key: string; title: string; isRealPackage: boolean }[];
  evidence: {
    proof: Record<string, unknown> | null;
    preparedPr: string | null;
    manifest: Record<string, unknown> | null;
    transcript: string | null;
    sourceCode: {
      relativePath: string;
      content: string;
      line: number;
    } | null;
  };
  readiness: {
    proofArtifactPresent: boolean;
    proofArtifactValid: boolean;
    preparedPrPresent: boolean;
    testResultDataPresent: boolean;
    sourceDiffPresent: boolean;
    overallStatus: 'passed' | 'failed' | 'incomplete' | 'unavailable';
    errors: string[];
  };
  reproduction: {
    runCommand: string;
    installCommand: string;
    artifactDirectory: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const runKey = searchParams.get('run') || 'lodash';

  // Strict allowlist validation: disallow path traversal or unknown keys
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_RUNS, runKey)) {
    return NextResponse.json(
      {
        error: `Invalid run key: '${runKey}'. Allowed run keys are: ${Object.keys(ALLOWED_RUNS).join(', ')}`,
      },
      { status: 400 },
    );
  }

  const config = ALLOWED_RUNS[runKey];
  const repoRoot = findRepoRoot();
  const artifactDir = path.resolve(repoRoot, config.artifactDirRel);

  // Security check: ensure resolved artifactDir stays within repoRoot
  const normalizedRoot = path.normalize(repoRoot);
  const normalizedArtifactDir = path.normalize(artifactDir);
  if (!normalizedArtifactDir.startsWith(normalizedRoot)) {
    return NextResponse.json({ error: 'Access denied: path outside repository boundary' }, { status: 403 });
  }

  const errors: string[] = [];
  let proofJson: Record<string, unknown> | null = null;
  let preparedPrText: string | null = null;
  let manifestJson: Record<string, unknown> | null = null;
  let transcriptText: string | null = null;
  let sourceContent: string | null = null;

  const proofPath = path.join(artifactDir, 'proof.json');
  const prPath = path.join(artifactDir, 'prepared-pr.md');
  const manifestPath = path.join(artifactDir, 'manifest.json');
  const transcriptPath = path.join(artifactDir, 'transcript.txt');
  const sourcePath = path.resolve(repoRoot, config.sourceFileRel);

  // 1. Try reading from filesystem if present (e.g. local development)
  const proofPresentOnDisk = fs.existsSync(/*turbopackIgnore: true*/ proofPath);
  if (proofPresentOnDisk) {
    try {
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ proofPath, 'utf8');
      proofJson = JSON.parse(raw);
    } catch (err) {
      errors.push(`proof.json on disk is malformed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Fallback to verified bundled artifact if not found on disk (e.g. Vercel deployment)
  if (!proofJson && errors.length === 0) {
    proofJson =
      runKey === 'lodash'
        ? (BUNDLED_LODASH_PROOF as Record<string, unknown>)
        : (BUNDLED_MOCKPAY_PROOF as Record<string, unknown>);
  }

  // Validate proof structure
  let proofValid = false;
  if (
    proofJson &&
    typeof proofJson === 'object' &&
    'baselineResult' in proofJson &&
    'redResult' in proofJson &&
    'greenResult' in proofJson
  ) {
    proofValid = true;
  } else if (errors.length === 0) {
    errors.push('proof artifact is missing required baselineResult, redResult, or greenResult fields');
  }

  // 2. Read prepared-pr.md
  if (fs.existsSync(/*turbopackIgnore: true*/ prPath)) {
    try {
      preparedPrText = fs.readFileSync(/*turbopackIgnore: true*/ prPath, 'utf8');
    } catch (err) {
      errors.push(`prepared-pr.md could not be read: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!preparedPrText) {
    preparedPrText = runKey === 'lodash' ? BUNDLED_LODASH_PR : BUNDLED_MOCKPAY_PR;
  }

  // 3. Read manifest.json (if present or bundled)
  if (fs.existsSync(/*turbopackIgnore: true*/ manifestPath)) {
    try {
      manifestJson = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ manifestPath, 'utf8'));
    } catch {
      // Best-effort
    }
  }
  if (!manifestJson && runKey === 'lodash') {
    manifestJson = BUNDLED_LODASH_MANIFEST as Record<string, unknown>;
  }

  // 4. Read transcript.txt (if present or bundled)
  if (fs.existsSync(/*turbopackIgnore: true*/ transcriptPath)) {
    try {
      transcriptText = fs.readFileSync(/*turbopackIgnore: true*/ transcriptPath, 'utf8');
    } catch {
      // Best-effort
    }
  }
  if (!transcriptText) {
    transcriptText = runKey === 'lodash' ? BUNDLED_LODASH_TRANSCRIPT : BUNDLED_MOCKPAY_TRANSCRIPT;
  }

  // 5. Read source snippet from fixture or bundled
  if (fs.existsSync(/*turbopackIgnore: true*/ sourcePath)) {
    try {
      sourceContent = fs.readFileSync(/*turbopackIgnore: true*/ sourcePath, 'utf8');
    } catch {
      // Best-effort
    }
  }
  if (!sourceContent) {
    sourceContent = runKey === 'lodash' ? BUNDLED_LODASH_SOURCE : BUNDLED_MOCKPAY_SOURCE;
  }

  const proofPresent = proofPresentOnDisk || Boolean(proofJson);
  const prPresent = Boolean(preparedPrText);

  // Evaluate readiness
  const testResultDataPresent = Boolean(
    proofValid &&
      proofJson &&
      typeof (proofJson.baselineResult as Record<string, unknown> | undefined)?.exitCode === 'number' &&
      typeof (proofJson.redResult as Record<string, unknown> | undefined)?.exitCode === 'number' &&
      typeof (proofJson.greenResult as Record<string, unknown> | undefined)?.exitCode === 'number',
  );

  const sourceDiffPresent = Boolean(
    proofValid &&
      proofJson &&
      typeof proofJson.fixDiff === 'string' &&
      proofJson.fixDiff.trim().length > 0,
  );

  let overallStatus: 'passed' | 'failed' | 'incomplete' | 'unavailable' = 'unavailable';
  if (errors.length > 0 || !proofValid || !testResultDataPresent) {
    overallStatus = (!proofPresent && errors.length === 0) ? 'unavailable' : 'incomplete';
  } else {
    const baselineExit = (proofJson?.baselineResult as Record<string, unknown> | undefined)?.exitCode;
    const redExit = (proofJson?.redResult as Record<string, unknown> | undefined)?.exitCode;
    const greenExit = (proofJson?.greenResult as Record<string, unknown> | undefined)?.exitCode;

    if (baselineExit === 0 && redExit !== 0 && greenExit === 0) {
      overallStatus = 'passed';
    } else {
      overallStatus = 'failed';
    }
  }

  const status =
    overallStatus === 'passed'
      ? 'ready'
      : errors.some((e) => e.includes('malformed'))
        ? 'malformed'
        : overallStatus === 'unavailable'
          ? 'missing'
          : 'failed';

  const response: DemoArtifactResponse = {
    status,
    config,
    availableRuns: Object.values(ALLOWED_RUNS).map((r) => ({
      key: r.key,
      title: r.title,
      isRealPackage: r.isRealPackage,
    })),
    evidence: {
      proof: proofJson,
      preparedPr: preparedPrText,
      manifest: manifestJson,
      transcript: transcriptText,
      sourceCode: sourceContent
        ? {
            relativePath: config.sourceFileRel,
            content: sourceContent,
            line: config.sourceLine,
          }
        : null,
    },
    readiness: {
      proofArtifactPresent: proofPresent,
      proofArtifactValid: proofValid,
      preparedPrPresent: prPresent,
      testResultDataPresent,
      sourceDiffPresent,
      overallStatus,
      errors,
    },
    reproduction: {
      runCommand: config.reproductionCommand,
      installCommand: 'npm install',
      artifactDirectory: config.artifactDirRel,
    },
  };

  const headers = new Headers();
  headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

  return NextResponse.json(response, { headers });
}
