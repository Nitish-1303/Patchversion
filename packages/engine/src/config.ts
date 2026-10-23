import path from 'path';

export interface EngineConfig {
  /** Root directory for state persistence */
  stateDir: string;
  /** Sandbox mode: docker-isolated or local child process fallback */
  sandboxMode: 'docker' | 'local';
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

export function loadConfig(overrides?: Partial<EngineConfig>): EngineConfig {
  return {
    stateDir: overrides?.stateDir ?? path.join(process.cwd(), '.patchversion-state'),
    sandboxMode: overrides?.sandboxMode ?? (isDockerAvailable() ? 'docker' : 'local'),
    sandboxTimeoutMs: overrides?.sandboxTimeoutMs ?? 120_000,
    dailyLlmBudgetUsd: overrides?.dailyLlmBudgetUsd ?? 5.0,
    githubApp: overrides?.githubApp ?? null,
    anthropicApiKey: overrides?.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? null,
    watcherIntervalMs: overrides?.watcherIntervalMs ?? 3_600_000, // 1 hour
    probeIntervalMs: overrides?.probeIntervalMs ?? 14_400_000, // 4 hours
    logLevel: overrides?.logLevel ?? 'info',
  };
}

function isDockerAvailable(): boolean {
  try {
    require('child_process').execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
