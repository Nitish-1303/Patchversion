import path from 'path';

export interface EngineConfig {
  /** Root directory for state persistence */
  stateDir: string;
  /**
   * Sandbox mode. 'docker' is BLOCKED everywhere: container isolation has
   * never been validated, so no config value enables it. 'local' runs repo
   * code as a plain child process with NO isolation - only trusted
   * directories (see trustedFixtureDirs) may be executed this way.
   */
  sandboxMode: 'docker' | 'local';
  /**
   * Fail-closed gate, default true: refuse to execute any repository that
   * is not under trustedFixtureDirs while the sandbox is unisolated.
   * Customer repositories stay blocked until a verified isolated sandbox
   * exists. Setting this to false only makes sense for tests of the
   * runner itself and is not production permission.
   */
  requireIsolation: boolean;
  /**
   * Absolute paths of the bundled fixture roots that may run unisolated.
   * Defaults to this repository's fixtures/ directory.
   */
  trustedFixtureDirs: string[];
  /** Maximum time (ms) for a sandbox run before timeout */
  sandboxTimeoutMs: number;
  /** Maximum LLM budget per day per install (USD) */
  dailyLlmBudgetUsd: number;
  /** GitHub App config (populated when app is registered) */
  githubApp: {
    appId: string;
    privateKeyPath: string;
    webhookSecret: string;
    clientId: string;
    clientSecret: string;
  } | null;
  /** Anthropic API key for fix generation */
  anthropicApiKey: string | null;
  /** Watcher polling interval (ms) */
  watcherIntervalMs: number;
  /** Probe scheduling interval (ms) */
  probeIntervalMs: number;
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/** Repository root (works from both src/ and dist/). */
function repoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..');
}

export function loadConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  const sandboxMode = overrides?.sandboxMode ?? 'local';
  if (sandboxMode === 'docker') {
    throw new Error(
      'Docker sandbox mode is UNVERIFIED and blocked: container isolation ' +
      'has never been validated on any host. Use local mode (trusted fixtures only).',
    );
  }

  const config: EngineConfig = {
    stateDir: overrides?.stateDir ?? path.join(process.cwd(), '.patchversion-state'),
    sandboxMode,
    requireIsolation: overrides?.requireIsolation ?? true,
    trustedFixtureDirs: overrides?.trustedFixtureDirs ?? [path.join(repoRoot(), 'fixtures')],
    sandboxTimeoutMs: overrides?.sandboxTimeoutMs ?? 120_000,
    dailyLlmBudgetUsd: overrides?.dailyLlmBudgetUsd ?? 5.0,
    githubApp: overrides?.githubApp ?? null,
    anthropicApiKey: overrides?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? null,
    watcherIntervalMs: overrides?.watcherIntervalMs ?? 3_600_000, // 1 hour
    probeIntervalMs: overrides?.probeIntervalMs ?? 14_400_000, // 4 hours
    logLevel: overrides?.logLevel ?? 'info',
  };

  // Snapshot the policy fields so later caller mutation of the overrides
  // object cannot change enforcement mid-run.
  return Object.freeze({
    ...config,
    trustedFixtureDirs: Object.freeze([...config.trustedFixtureDirs]) as unknown as string[],
  }) as EngineConfig;
}
