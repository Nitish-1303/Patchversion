import crypto from 'crypto';
import {
  assertStrongSigningSecret,
  parseRequiredJobId,
  parseRequiredTenantId,
} from './execution-provider';

export const LIFECYCLE_CAPABILITY_HEADER = 'x-patchversion-lifecycle-capability';
export const LIFECYCLE_CAPABILITY_ISSUER = 'trypatchbay-control-plane';
export const LIFECYCLE_CAPABILITY_AUDIENCE = 'trypatchbay-worker';
export const LIFECYCLE_CAPABILITY_TTL_MS = 60_000;
export const LIFECYCLE_CAPABILITY_MAX_TTL_MS = 5 * 60_000;

export const LIFECYCLE_OPS = ['status', 'cancel', 'artifacts', 'cleanup'] as const;
export type LifecycleOp = (typeof LIFECYCLE_OPS)[number];

export interface LifecycleCapabilityClaims {
  v: 1;
  iss: typeof LIFECYCLE_CAPABILITY_ISSUER;
  aud: typeof LIFECYCLE_CAPABILITY_AUDIENCE;
  tenantId: string;
  jobId: string;
  op: LifecycleOp;
  exp: number;
  jti: string;
}

export type LifecycleCapabilityFailureReason =
  | 'missing_capability'
  | 'malformed_capability'
  | 'invalid_signature'
  | 'expired'
  | 'wrong_issuer'
  | 'wrong_audience'
  | 'scope_mismatch'
  | 'revoked'
  | 'replay';

export type VerifyLifecycleCapabilityResult =
  | { valid: true; claims: LifecycleCapabilityClaims }
  | { valid: false; reason: LifecycleCapabilityFailureReason };

function isLifecycleOp(value: unknown): value is LifecycleOp {
  return typeof value === 'string' && (LIFECYCLE_OPS as readonly string[]).includes(value);
}

function toBase64Url(buf: Buffer): string {
  return buf.toString('base64url');
}

function hmacCapability(encodedClaims: string, signingSecret: string): Buffer {
  return crypto.createHmac('sha256', signingSecret).update(encodedClaims, 'utf8').digest();
}

function timingSafeEqualBuf(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createLifecycleCapability(
  input: {
    tenantId: string;
    jobId: string;
    op: LifecycleOp;
    exp?: number;
    jti?: string;
  },
  signingSecret: string,
): string {
  assertStrongSigningSecret(signingSecret);
  const tenantId = parseRequiredTenantId(input.tenantId);
  const jobId = parseRequiredJobId(input.jobId);
  if (!tenantId || !jobId || !isLifecycleOp(input.op)) {
    throw new Error('Cannot mint lifecycle capability: tenantId, jobId, and op are required');
  }
  const now = Date.now();
  const exp = input.exp ?? now + LIFECYCLE_CAPABILITY_TTL_MS;
  if (!Number.isFinite(exp) || exp <= now) {
    throw new Error('Cannot mint lifecycle capability: exp must be in the future');
  }
  const jti = input.jti ?? crypto.randomBytes(16).toString('hex');
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(jti)) {
    throw new Error('Cannot mint lifecycle capability: invalid jti');
  }
  const claims: LifecycleCapabilityClaims = {
    v: 1,
    iss: LIFECYCLE_CAPABILITY_ISSUER,
    aud: LIFECYCLE_CAPABILITY_AUDIENCE,
    tenantId,
    jobId,
    op: input.op,
    exp,
    jti,
  };
  const encodedClaims = toBase64Url(Buffer.from(JSON.stringify(claims), 'utf8'));
  const mac = toBase64Url(hmacCapability(encodedClaims, signingSecret));
  return `pvcap1.${encodedClaims}.${mac}`;
}

export function verifyLifecycleCapability(
  token: string | null | undefined,
  signingSecret: string,
  expected?: { tenantId?: string; jobId?: string; op?: LifecycleOp },
): VerifyLifecycleCapabilityResult {
  if (token == null || typeof token !== 'string' || token.trim() === '') {
    return { valid: false, reason: 'missing_capability' };
  }
  if (!signingSecret || signingSecret.trim() === '') {
    return { valid: false, reason: 'malformed_capability' };
  }
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'pvcap1' || !parts[1] || !parts[2]) {
    return { valid: false, reason: 'malformed_capability' };
  }
  let macProvided: Buffer;
  let macExpected: Buffer;
  try {
    macProvided = Buffer.from(parts[2], 'base64url');
    macExpected = hmacCapability(parts[1], signingSecret);
  } catch {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (!timingSafeEqualBuf(macProvided, macExpected)) {
    return { valid: false, reason: 'invalid_signature' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, reason: 'malformed_capability' };
  }
  const body = parsed as Record<string, unknown>;
  if (body.v !== 1) {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (body.iss !== LIFECYCLE_CAPABILITY_ISSUER) {
    return { valid: false, reason: 'wrong_issuer' };
  }
  if (body.aud !== LIFECYCLE_CAPABILITY_AUDIENCE) {
    return { valid: false, reason: 'wrong_audience' };
  }
  const tenantId = parseRequiredTenantId(typeof body.tenantId === 'string' ? body.tenantId : null);
  const jobId = parseRequiredJobId(typeof body.jobId === 'string' ? body.jobId : null);
  if (!tenantId || !jobId || !isLifecycleOp(body.op)) {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (typeof body.exp !== 'number' || !Number.isFinite(body.exp)) {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (typeof body.jti !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(body.jti)) {
    return { valid: false, reason: 'malformed_capability' };
  }
  const now = Date.now();
  if (body.exp <= now) {
    return { valid: false, reason: 'expired' };
  }
  if (body.exp > now + LIFECYCLE_CAPABILITY_MAX_TTL_MS) {
    return { valid: false, reason: 'malformed_capability' };
  }
  if (expected?.op && body.op !== expected.op) {
    return { valid: false, reason: 'scope_mismatch' };
  }
  if (expected?.jobId) {
    const expectedJob = parseRequiredJobId(expected.jobId);
    if (!expectedJob || expectedJob !== jobId) {
      return { valid: false, reason: 'scope_mismatch' };
    }
  }
  if (expected?.tenantId) {
    const expectedTenant = parseRequiredTenantId(expected.tenantId);
    if (!expectedTenant || expectedTenant !== tenantId) {
      return { valid: false, reason: 'scope_mismatch' };
    }
  }
  return {
    valid: true,
    claims: {
      v: 1,
      iss: LIFECYCLE_CAPABILITY_ISSUER,
      aud: LIFECYCLE_CAPABILITY_AUDIENCE,
      tenantId,
      jobId,
      op: body.op,
      exp: body.exp,
      jti: body.jti,
    },
  };
}

export function lifecycleCapabilityHeaders(
  authToken: string,
  signingSecret: string,
  input: { tenantId: string; jobId: string; op: LifecycleOp; exp?: number; jti?: string },
): Record<string, string> {
  return {
    Authorization: `Bearer ${authToken}`,
    [LIFECYCLE_CAPABILITY_HEADER]: createLifecycleCapability(input, signingSecret),
  };
}
