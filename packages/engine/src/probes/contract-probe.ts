import https from 'https';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { EndpointBaseline, ProbeDrift, ChangeRecord } from '@patchversion/shared';
import { StateStore } from '../state/store';

/**
 * Live API contract probes: the market's weakest-covered area.
 *
 * Instead of only watching changelogs and registries, probes hit real
 * API endpoints on a schedule and compare the live response shape
 * against a stored baseline. Drift = a detection event, even if
 * no release notes exist.
 *
 * This catches:
 * - Silent API changes (no changelog)
 * - Field type changes (string -> number)
 * - Removed fields
 * - Auth flow changes
 * - Webhook payload shape changes
 */
export class ContractProber {
  private store: StateStore;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(store: StateStore, intervalMs = 14_400_000) {
    this.store = store;
    this.intervalMs = intervalMs;
  }

  start(): void {
    this.probeAll();
    this.timer = setInterval(() => this.probeAll(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * Probe all baselined endpoints.
   */
  async probeAll(): Promise<ProbeDrift[]> {
    const baselines = this.loadBaselines();
    const drifts: ProbeDrift[] = [];

    for (const baseline of baselines) {
      try {
        const drift = await this.probeEndpoint(baseline);
        if (drift.length > 0) {
          drifts.push(...drift);
          // Convert drift to a change record
          const change = this.driftToChange(baseline, drift);
          this.store.saveChange(change);
        }
      } catch (err) {
        this.store.logEvent('probe_error', {
          endpoint: baseline.endpoint,
          error: String(err),
        });
      }
    }

    return drifts;
  }

  /**
   * Capture a baseline for an endpoint.
   */
  async captureBaseline(
    endpoint: string,
    method: string,
    headers?: Record<string, string>,
  ): Promise<EndpointBaseline> {
    const response = await this.makeRequest(endpoint, method, headers);
    const schema = this.extractSchema(response.body);

    const baseline: EndpointBaseline = {
      endpoint,
      method,
      responseSchema: schema,
      statusCode: response.statusCode,
      capturedAt: new Date().toISOString(),
    };

    // Store the baseline
    const key = crypto.createHash('sha256').update(endpoint + method).digest('hex').slice(0, 16);
    const dir = this.store.getBaselinesDir();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${key}.json`),
      JSON.stringify(baseline, null, 2),
    );

    return baseline;
  }

  /**
   * Probe a single endpoint against its baseline.
   */
  private async probeEndpoint(baseline: EndpointBaseline): Promise<ProbeDrift[]> {
    const response = await this.makeRequest(baseline.endpoint, baseline.method);
    const currentSchema = this.extractSchema(response.body);
    const drifts: ProbeDrift[] = [];

    // Compare schemas
    this.compareSchemas(
      baseline.responseSchema,
      currentSchema,
      baseline.endpoint,
      '',
      drifts,
    );

    // Check status code change
    if (response.statusCode !== baseline.statusCode) {
      drifts.push({
        endpoint: baseline.endpoint,
        field: '_statusCode',
        expectedType: String(baseline.statusCode),
        actualType: String(response.statusCode),
        detectedAt: new Date().toISOString(),
      });
    }

    return drifts;
  }

  private async makeRequest(
    url: string,
    method: string,
    headers?: Record<string, string>,
  ): Promise<{ statusCode: number; body: unknown }> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method, headers, timeout: 30_000 }, (res) => {
        let data = '';
        res.on('data', chunk => {
          // Cap response size - a runaway endpoint must not exhaust memory
          if (data.length < 5 * 1024 * 1024) data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode ?? 0, body: data });
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.end();
    });
  }

  /**
   * Extract a schema fingerprint from a response body.
   * Maps each field path to its type.
   */
  private extractSchema(body: unknown, prefix = ''): Record<string, string> {
    const schema: Record<string, string> = {};

    if (body === null || body === undefined) {
      schema[prefix || '_root'] = 'null';
      return schema;
    }

    if (Array.isArray(body)) {
      schema[prefix || '_root'] = 'array';
      if (body.length > 0) {
        const itemSchema = this.extractSchema(body[0], `${prefix}[0]`);
        Object.assign(schema, itemSchema);
      }
      return schema;
    }

    if (typeof body === 'object') {
      schema[prefix || '_root'] = 'object';
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        Object.assign(schema, this.extractSchema(value, fieldPath));
      }
      return schema;
    }

    schema[prefix || '_root'] = typeof body;
    return schema;
  }

  private compareSchemas(
    baseline: Record<string, unknown>,
    current: Record<string, unknown>,
    endpoint: string,
    prefix: string,
    drifts: ProbeDrift[],
  ): void {
    // Fields in baseline but missing from current = removed
    for (const key of Object.keys(baseline)) {
      if (!(key in current)) {
        drifts.push({
          endpoint,
          field: key,
          expectedType: String(baseline[key]),
          actualType: 'missing',
          detectedAt: new Date().toISOString(),
        });
      } else if (baseline[key] !== current[key]) {
        drifts.push({
          endpoint,
          field: key,
          expectedType: String(baseline[key]),
          actualType: String(current[key]),
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Fields in current but not in baseline = new (not breaking, but noteworthy)
    for (const key of Object.keys(current)) {
      if (!(key in baseline)) {
        // New field - informational only
        this.store.logEvent('new_field_detected', { endpoint, field: key, type: current[key] });
      }
    }
  }

  private driftToChange(baseline: EndpointBaseline, drifts: ProbeDrift[]): ChangeRecord {
    const driftSummary = drifts.map(d => `${d.field}: ${d.expectedType} -> ${d.actualType}`).join('; ');

    const isBreaking = drifts.some(d => d.actualType === 'missing' || d.field === '_statusCode');
    return {
      // Deterministic id: the same drift at the same endpoint re-detected
      // later overwrites the same record instead of duplicating it.
      id: `probe-${crypto.createHash('sha256').update(baseline.endpoint + driftSummary).digest('hex').slice(0, 16)}`,
      packageName: baseline.endpoint,
      ecosystem: 'remote-api',
      fromVersion: 'baseline',
      toVersion: 'live',
      detectedAt: new Date().toISOString(),
      source: 'live-probe',
      sourceUrl: baseline.endpoint,
      rawNotes: `Live probe drift detected: ${driftSummary}`,
      classification: {
        isBreaking,
        confidence: 0.9, // Live drift is high-confidence
        affectedEndpoints: [baseline.endpoint],
        reason: `${drifts.length} field(s) drifted from baseline`,
      },
      severity: isBreaking ? 'breaking' : 'unknown',
    };
  }

  private loadBaselines(): EndpointBaseline[] {
    const dir = this.store.getBaselinesDir();
    if (!fs.existsSync(dir)) return [];
    const baselines: EndpointBaseline[] = [];
    for (const f of fs.readdirSync(dir).filter((f: string) => f.endsWith('.json'))) {
      try {
        baselines.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
      } catch {
        this.store.logEvent('state_corrupt', { file: f });
      }
    }
    return baselines;
  }
}
