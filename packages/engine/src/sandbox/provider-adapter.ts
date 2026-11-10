import { EngineConfig } from '../config';
import {
  IExecutionProvider,
  IExecutionJobProvider,
  UnavailableExecutionProvider,
  LocalTrustedFixtureProvider,
  assertStrongSigningSecret,
} from './execution-provider';
import { MicroVMFleetConfig } from './microvm-fleet-provider';

export { assertStrongSigningSecret, FORBIDDEN_DEFAULT_FLEET_SECRETS } from './execution-provider';

export interface ResolveProviderOptions {
  config?: EngineConfig;
  fleetConfig?: Partial<MicroVMFleetConfig>;
  signingSecret?: string;
  allowTrustedFixtureProvider?: boolean;
  /**
   * Injected only in tests. Production code must not set this.
   * A provider is independently qualified only when this object
   * opts in via independentlyQualified + the test-double name.
   */
  independentlyQualifiedProvider?: IExecutionProvider & Partial<IExecutionJobProvider> & {
    independentlyQualified?: boolean;
  };
}

export const TEST_DOUBLE_ISOLATED_PROVIDER_NAME = 'test-double-isolated-provider';

/**
 * Independent qualification is never implied by environment variables,
 * sandboxMode labels, fleet URLs, or health JSON.
 */
export function isQualifiedIsolationActive(): boolean {
  return false;
}

export function isIndependentlyQualifiedIsolation(provider: IExecutionProvider): boolean {
  const candidate = provider as IExecutionProvider & { independentlyQualified?: boolean };
  return (
    provider.type !== 'unavailable' &&
    provider.name === TEST_DOUBLE_ISOLATED_PROVIDER_NAME &&
    candidate.independentlyQualified === true
  );
}

/**
 * Resolve the execution provider.
 *
 * FAILS CLOSED for untrusted repositories. Env flags and emulateLocalMicroVM
 * never select a customer-capable backend. Trusted fixtures may use
 * LocalTrustedFixtureProvider when explicitly requested.
 */
export function resolveExecutionProvider(
  options?: ResolveProviderOptions,
): IExecutionProvider & Partial<IExecutionJobProvider> {
  if (options?.independentlyQualifiedProvider) {
    const injected = options.independentlyQualifiedProvider;
    if (!isIndependentlyQualifiedIsolation(injected)) {
      return new UnavailableExecutionProvider();
    }
    return injected;
  }

  if (options?.allowTrustedFixtureProvider) {
    const signingSecret = assertStrongSigningSecret(
      options.signingSecret ??
        options.fleetConfig?.signingSecret ??
        process.env.PATCHVERSION_SIGNING_SECRET ??
        process.env.MICROVM_SIGNING_SECRET,
    );
    return new LocalTrustedFixtureProvider(signingSecret, {
      fixtureRootDir: options.fleetConfig?.fixtureRootDir,
      nonceStore: options.fleetConfig?.nonceStore,
    }) as unknown as IExecutionProvider & Partial<IExecutionJobProvider>;
  }

  return new UnavailableExecutionProvider();
}
