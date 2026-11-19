export const ALLOWED_GITHUB_WEBHOOK_EVENTS = new Set([
  'ping',
  'installation',
  'installation_repositories',
  'github_app_authorization',
  'repository',
  'push',
  'pull_request',
  'check_run',
  'check_suite',
]);

export const WEBHOOK_REPLAY_WINDOW_MS = 15 * 60 * 1000;
export const WEBHOOK_PROCESSING_RETRY_AFTER_MS = 30 * 1000;

export function isAllowedGitHubWebhookEvent(event: string | undefined | null): boolean {
  return typeof event === 'string' && ALLOWED_GITHUB_WEBHOOK_EVENTS.has(event);
}

export function extractWebhookEventTime(payload: Record<string, unknown>): number | null {
  const candidates: unknown[] = [
    payload.updated_at,
    payload.created_at,
    (payload.installation as { updated_at?: unknown } | undefined)?.updated_at,
    (payload.repository as { updated_at?: unknown } | undefined)?.updated_at,
    (payload.check_run as { completed_at?: unknown } | undefined)?.completed_at,
    (payload.check_suite as { updated_at?: unknown } | undefined)?.updated_at,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' || value instanceof Date) {
      const ms = new Date(value).getTime();
      if (!Number.isNaN(ms)) return ms;
    }
  }
  return null;
}

export function isWebhookReplayOutsideWindow(eventTimeMs: number | null, now = Date.now()): boolean {
  if (eventTimeMs === null) return false;
  return now - eventTimeMs > WEBHOOK_REPLAY_WINDOW_MS && eventTimeMs < now;
}

export function isOutOfOrderWebhookEvent(
  incomingEventTimeMs: number | null,
  lastEventTimeMs: number | null,
): boolean {
  if (incomingEventTimeMs === null || lastEventTimeMs === null) return false;
  return incomingEventTimeMs < lastEventTimeMs;
}

export function webhookInstallationId(payload: Record<string, unknown>): number | null {
  const raw = (payload.installation as { id?: unknown } | undefined)?.id;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) {
    const parsed = Number(raw);
    if (parsed > 0) return parsed;
  }
  return null;
}
