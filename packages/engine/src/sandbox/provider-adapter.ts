import { EngineConfig } from '../config';
import {
  IExecutionProvider,
  IExecutionJobProvider,
  UnavailableExecutionProvider,
  LocalTrustedFixtureProvider,
} from './execution-provider';
import { MicroVMFleetProvider, MicroVMFleetConfig } from './microvm-fleet-provider';

export interface ResolveProviderOptions {
  config?: EngineConfig;
  fleetConfig?: Partial<MicroVMFleetConfig>;
  signingSecret?: string;
  allowTrustedFixtureProvider?: boolean;
}

/**
 * Determine whether a qualified container or microVM isolation backend is active.
 */
export function isQualifiedIsolationActive(): boolean {
  return Boolean(
    process.env.QUALIFIED_ISOLATION_BACKEND ||
    process.env.MICROVM_FLEET_URL ||
    process.env.PATCHVERSION_SANDBOX_MODE === 'microvm'
  );
}

/**
 * Resolve the appropriate execution provider based on configuration and environment.
 *
 * FAILS CLOSED: untrusted repository execution is refused unless a qualified
 * MicroVM fleet endpoint is provisioned.
 */
export function resolveExecutionProvider(
  options?: ResolveProviderOptions,
): IExecutionProvider & Partial<IExecutionJobProvider> {
  const signingSecret =
    options?.signingSecret ??
    options?.fleetConfig?.signingSecret ??
    process.env.MICROVM_SIGNING_SECRET ??
    process.env.PATCHVERSION_SIGNING_SECRET ??
    'trypatchbay-default-fleet-signing-secret';

  const fleetUrl = options?.fleetConfig?.fleetEndpoint ?? process.env.MICROVM_FLEET_URL;
  const isMicroVMMode =
    options?.config?.sandboxMode === 'microvm' ||
    process.env.PATCHVERSION_SANDBOX_MODE === 'microvm' ||
    Boolean(fleetUrl) ||
    Boolean(options?.fleetConfig?.emulateLocalMicroVM);

  if (isMicroVMMode) {
    return new MicroVMFleetProvider({
      fleetEndpoint: fleetUrl,
      authToken: options?.fleetConfig?.authToken ?? process.env.MICROVM_AUTH_TOKEN,
      signingSecret,
      emulateLocalMicroVM: options?.fleetConfig?.emulateLocalMicroVM,
      region: options?.fleetConfig?.region ?? process.env.FLY_REGION ?? process.env.AWS_REGION ?? 'iad',
      maxConcurrency: options?.fleetConfig?.maxConcurrency,
      defaultLimits: options?.fleetConfig?.defaultLimits,
      networkPolicy: options?.fleetConfig?.networkPolicy,
      fixtureRootDir: options?.fleetConfig?.fixtureRootDir,
      nonceStore: options?.fleetConfig?.nonceStore,
    });
  }

  if (options?.allowTrustedFixtureProvider) {
    return new LocalTrustedFixtureProvider(signingSecret, {
      fixtureRootDir: options?.fleetConfig?.fixtureRootDir,
      nonceStore: options?.fleetConfig?.nonceStore,
    }) as unknown as IExecutionProvider & Partial<IExecutionJobProvider>;
  }

  return new UnavailableExecutionProvider();
}
