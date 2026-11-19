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
