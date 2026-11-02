import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, getWebhookSecret } from '@/app/api/backend';
import { verifyGitHubWebhookSignature } from '@patchversion/engine';
import { ProofArtifact } from '@patchversion/shared';

export async function POST(request: NextRequest) {
  const deliveryId = request.headers.get('x-github-delivery');
  const signature = request.headers.get('x-hub-signature-256') ?? undefined;
  const event = request.headers.get('x-github-event') ?? 'unknown';

  if (!deliveryId) {
    return NextResponse.json({ error: 'Missing x-github-delivery header' }, { status: 400 });
  }

  // Read raw bytes for exact HMAC calculation
  const rawArrayBuffer = await request.arrayBuffer();
  const rawBody = Buffer.from(rawArrayBuffer);

  // Payload size limit: 1 MiB
  if (rawBody.length > 1024 * 1024) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  // Obtain webhook secret independently of GitHub App API credentials
  const webhookSecret = getWebhookSecret();

  // Signature verification
  const verification = verifyGitHubWebhookSignature(rawBody, signature, webhookSecret);
  if (!verification.valid) {
    if (verification.reason === 'whitespace_in_secret') {
      console.error(
        '[webhook] Webhook secret contains whitespace characters. Refusing verification until configuration is corrected.',
      );
    } else if (verification.reason === 'missing_secret' || verification.reason === 'empty_secret') {
      console.error('[webhook] Webhook secret is not configured.');
    }
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  // Parse JSON payload before recording delivery as processed
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
  }

  // Deduplication check: reject replayed deliveries
  const db = getDatabase();
  const isNew = await db.recordWebhookDelivery(deliveryId, event, signature ?? '');
  if (!isNew) {
    return NextResponse.json({ message: 'Delivery already processed' }, { status: 200 });
  }

  try {
    // Process CI verification check_run events
    if (event === 'check_run') {
      const checkRun = payload.check_run as {
        id?: number;
        name?: string;
        head_sha?: string;
        conclusion?: string;
        html_url?: string;
        completed_at?: string;
      } | undefined;

      if (payload.action === 'completed' && checkRun?.head_sha) {
        const headSha = checkRun.head_sha;
        const conclusion = checkRun.conclusion;
        const pr = db.getPullRequestByCommitSha ? await db.getPullRequestByCommitSha(headSha) : null;
        if (pr) {
          const status = conclusion === 'success' ? 'passed' : 'failed';
          await db.saveValidation(pr.tenantId, pr.patchId, {
            status,
            proof: {
              type: 'github_actions_ci',
              checkRunId: checkRun.id,
              name: checkRun.name,
              conclusion,
              htmlUrl: checkRun.html_url,
              headSha,
              completedAt: checkRun.completed_at || new Date().toISOString(),
            } as unknown as ProofArtifact,
            executionLogs: `GitHub Actions CI Check Run "${checkRun.name || 'test'}" finished with conclusion: ${conclusion}`,
            durationMs: 0,
          });

          if (status === 'passed') {
            const finding = await db.getFinding(pr.tenantId, pr.findingId);
            if (finding && finding.status !== 'validated') {
              await db.saveFinding(pr.tenantId, pr.repositoryId, {
                ...finding,
                status: 'validated',
              });
            }
          }
        }
      }
    }

    // Process check_suite events
    if (event === 'check_suite') {
      const checkSuite = payload.check_suite as {
        id?: number;
        head_sha?: string;
        conclusion?: string;
      } | undefined;

      if (payload.action === 'completed' && checkSuite?.head_sha) {
        const headSha = checkSuite.head_sha;
        const conclusion = checkSuite.conclusion;
        const pr = db.getPullRequestByCommitSha ? await db.getPullRequestByCommitSha(headSha) : null;
        if (pr) {
          const status = conclusion === 'success' ? 'passed' : 'failed';
          await db.saveValidation(pr.tenantId, pr.patchId, {
            status,
            proof: {
              type: 'github_actions_suite',
              checkSuiteId: checkSuite.id,
              conclusion,
              headSha,
              completedAt: new Date().toISOString(),
            } as unknown as ProofArtifact,
            executionLogs: `GitHub Actions Check Suite concluded with: ${conclusion}`,
            durationMs: 0,
          });

          if (status === 'passed') {
            const finding = await db.getFinding(pr.tenantId, pr.findingId);
            if (finding && finding.status !== 'validated') {
              await db.saveFinding(pr.tenantId, pr.repositoryId, {
                ...finding,
                status: 'validated',
              });
            }
          }
        }
      }
    }

    // Process pull_request lifecycle events (merged, closed)
    if (event === 'pull_request') {
      const prPayload = payload.pull_request as {
        number?: number;
        merged?: boolean;
        head?: { sha?: string };
      } | undefined;

      if (payload.action === 'closed' && prPayload?.head?.sha) {
        const headSha = prPayload.head.sha;
        const pr = db.getPullRequestByCommitSha ? await db.getPullRequestByCommitSha(headSha) : null;
        if (pr && db.updatePullRequestStatus) {
          const status = prPayload.merged ? 'merged' : 'closed';
          await db.updatePullRequestStatus(pr.tenantId, pr.id, status);
        }
      }
    }

    // Process installation events: deleted, suspend, unsuspend
    if (event === 'installation') {
      const instPayload = payload.installation as { id?: number | string } | undefined;
      const githubInstallationId = instPayload?.id;
      if (typeof githubInstallationId === 'number' || typeof githubInstallationId === 'string') {
        const numericId = Number(githubInstallationId);
        const inst = await db.getInstallationByGithubId(numericId);
        if (inst) {
          if (payload.action === 'deleted') {
            await db.updateInstallationStatus(inst.tenantId, numericId, 'deleted');
          } else if (payload.action === 'suspend') {
            await db.updateInstallationStatus(inst.tenantId, numericId, 'suspended');
          } else if (payload.action === 'unsuspend') {
            await db.updateInstallationStatus(inst.tenantId, numericId, 'active');
          }
        }
      }
    }

    return NextResponse.json({ status: 'accepted', deliveryId, event });
  } catch (err) {
    console.error('[webhook] Processing error:', err);
    return NextResponse.json(
      { error: `Webhook processing failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
