import fs from 'fs';
import { Pool, PoolClient } from 'pg';
import { DatabaseSchema } from './database';

export interface MigrationResult {
  success: boolean;
  backupPath: string;
  totalRecordsMigrated: number;
  tableCounts: Record<string, number>;
}

/**
 * Transactional migrator from JSON state database to PostgreSQL.
 * Validates state schema, creates an immutable pre-migration backup,
 * and inserts records in strict foreign-key dependency order.
 */
export async function migrateJsonToPostgres(
  jsonDbPath: string,
  pool: Pool,
): Promise<MigrationResult> {
  if (!fs.existsSync(jsonDbPath)) {
    throw new Error(`Source JSON database file not found at ${jsonDbPath}`);
  }

  // 1. Create durable backup
  const timestamp = Date.now();
  const backupPath = `${jsonDbPath}.${timestamp}.backup.json`;
  const rawData = fs.readFileSync(jsonDbPath, 'utf8');
  fs.writeFileSync(backupPath, rawData, 'utf8');

  // 2. Parse and validate JSON structure
  const data: DatabaseSchema = JSON.parse(rawData);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid JSON database: content is not an object');
  }

  const tableCounts: Record<string, number> = {};
  let totalRecordsMigrated = 0;

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Tenants
    let tenantCount = 0;
    for (const t of Object.values(data.tenants || {})) {
      await client.query(
        'INSERT INTO tenants (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [t.id, t.name, t.createdAt],
      );
      tenantCount++;
    }
    tableCounts['tenants'] = tenantCount;

    // 2. Users
    let userCount = 0;
    for (const u of Object.values(data.users || {})) {
      await client.query(
        `INSERT INTO users (id, tenant_id, email, role, github_user_id, github_login, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET email = $3, role = $4`,
        [u.id, u.tenantId, u.email, u.role, u.githubUserId || null, u.githubLogin || null, u.createdAt],
      );
      userCount++;
    }
    tableCounts['users'] = userCount;

    // 3. Sessions
    let sessionCount = 0;
    for (const s of Object.values(data.sessions || {})) {
      await client.query(
        `INSERT INTO sessions (id, user_id, tenant_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.userId, s.tenantId, s.token, s.expiresAt, s.createdAt],
      );
      sessionCount++;
    }
    tableCounts['sessions'] = sessionCount;

    // 4. Revoked Sessions
    let revokedCount = 0;
    for (const [sessionId, revokedAt] of Object.entries(data.revokedSessionIds || {})) {
      await client.query(
        'INSERT INTO revoked_sessions (session_id, revoked_at) VALUES ($1, $2) ON CONFLICT (session_id) DO NOTHING',
        [sessionId, revokedAt],
      );
      revokedCount++;
    }
    tableCounts['revoked_sessions'] = revokedCount;

    // 5. Installations
    let instCount = 0;
    for (const inst of Object.values(data.installations || {})) {
      await client.query(
        `INSERT INTO installations (id, tenant_id, github_installation_id, account_login, account_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (github_installation_id) DO NOTHING`,
        [
          inst.id,
          inst.tenantId,
          inst.githubInstallationId,
          inst.accountLogin,
          inst.accountType,
          inst.status,
          inst.createdAt,
          inst.updatedAt,
        ],
      );
      instCount++;
    }
    tableCounts['installations'] = instCount;

    // 6. Repositories
    let repoCount = 0;
    for (const r of Object.values(data.repositories || {})) {
      await client.query(
        `INSERT INTO repositories (id, tenant_id, installation_id, github_repo_id, full_name, owner, name, default_branch, is_private, status, local_path, is_demo, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (github_repo_id) DO NOTHING`,
        [
          r.id,
          r.tenantId,
          r.installationId,
          r.githubRepoId,
          r.fullName,
          r.owner,
          r.name,
          r.defaultBranch,
          r.isPrivate,
          r.status,
          r.localPath || null,
          Boolean(r.isDemo),
          r.createdAt,
          r.updatedAt,
        ],
      );
      repoCount++;
    }
    tableCounts['repositories'] = repoCount;

    // 7. Watch Targets
    let wtCount = 0;
    for (const wt of Object.values(data.watchTargets || {})) {
      await client.query(
        `INSERT INTO watch_targets (id, tenant_id, package_name, ecosystem, current_version, latest_version, last_checked_at, status, is_demo, notes, last_error, source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (tenant_id, package_name) DO NOTHING`,
        [
          wt.id,
          wt.tenantId,
          wt.packageName,
          wt.ecosystem,
          wt.currentVersion,
          wt.latestVersion,
          wt.lastCheckedAt,
          wt.status,
          Boolean(wt.isDemo),
          wt.notes || null,
          wt.lastError || null,
          wt.source,
          wt.createdAt,
          wt.updatedAt,
        ],
      );
      wtCount++;
    }
    tableCounts['watch_targets'] = wtCount;

    // 8. Findings
    let findingCount = 0;
    for (const f of Object.values(data.findings || {})) {
      await client.query(
        `INSERT INTO findings (id, tenant_id, repository_id, package_name, from_version, to_version, is_breaking, change_record, impact_analysis, status, source_analysis_performed, analysis_mode, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (tenant_id, repository_id, package_name, from_version, to_version) DO NOTHING`,
        [
          f.id,
          f.tenantId,
          f.repositoryId,
          f.packageName,
          f.fromVersion,
          f.toVersion,
          f.isBreaking,
          JSON.stringify(f.changeRecord),
          JSON.stringify(f.impactAnalysis),
          f.status,
          Boolean(f.sourceAnalysisPerformed),
          f.analysisMode || null,
          f.createdAt,
        ],
      );
      findingCount++;
    }
    tableCounts['findings'] = findingCount;

    // 9. Patches
    let patchCount = 0;
    for (const p of Object.values(data.patches || {})) {
      await client.query(
        `INSERT INTO patches (id, tenant_id, finding_id, diff_content, diff_hash, lockfile_updates, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.tenantId, p.findingId, p.diffContent, p.diffHash, p.lockfileUpdates || null, p.status, p.createdAt],
      );
      patchCount++;
    }
    tableCounts['patches'] = patchCount;

    // 10. Validations
    let valCount = 0;
    for (const v of Object.values(data.validations || {})) {
      await client.query(
        `INSERT INTO validations (id, tenant_id, patch_id, status, proof, execution_logs, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          v.id,
          v.tenantId,
          v.patchId,
          v.status,
          v.proof ? JSON.stringify(v.proof) : null,
          v.executionLogs,
          v.durationMs,
          v.createdAt,
        ],
      );
      valCount++;
    }
    tableCounts['validations'] = valCount;

    // 11. Approvals
    let appCount = 0;
    for (const a of Object.values(data.approvals || {})) {
      await client.query(
        `INSERT INTO approvals (id, tenant_id, patch_id, approved_by_user_id, diff_hash_at_approval, status, approved_at, invalidated_at, invalidation_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          a.id,
          a.tenantId,
          a.patchId,
          a.approvedByUserId,
          a.diffHashAtApproval,
          a.status,
          a.approvedAt,
          a.invalidatedAt || null,
          a.invalidationReason || null,
        ],
      );
      appCount++;
    }
    tableCounts['approvals'] = appCount;

    // 12. Pull Requests
    let prCount = 0;
    for (const pr of Object.values(data.pullRequests || {})) {
      await client.query(
        `INSERT INTO pull_requests (id, tenant_id, repository_id, finding_id, patch_id, approval_id, github_pr_number, github_pr_url, branch_name, commit_sha, status, is_draft, is_simulation, delivery_blocked_reason, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (patch_id) DO NOTHING`,
        [
          pr.id,
          pr.tenantId,
          pr.repositoryId,
          pr.findingId,
          pr.patchId,
          pr.approvalId,
          pr.githubPrNumber,
          pr.githubPrUrl,
          pr.branchName,
          pr.commitSha,
          pr.status,
          Boolean(pr.isDraft),
          Boolean(pr.isSimulation),
          pr.deliveryBlockedReason || null,
          pr.createdAt,
          pr.updatedAt,
        ],
      );
      prCount++;
    }
    tableCounts['pull_requests'] = prCount;

    // 13. Onboarding States
    let onbCount = 0;
    for (const onb of Object.values(data.onboardingStates || {})) {
      await client.query(
        `INSERT INTO onboarding_states (id, token, tenant_id, user_id, target_account, status, created_at, expires_at, completed_at, installation_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (token) DO NOTHING`,
        [
          onb.id,
          onb.token,
          onb.tenantId,
          onb.userId,
          onb.targetAccount || null,
          onb.status,
          onb.createdAt,
          onb.expiresAt,
          onb.completedAt || null,
          onb.installationId || null,
        ],
      );
      onbCount++;
    }
    tableCounts['onboarding_states'] = onbCount;

    // 14. Delivery Claims
    let claimCount = 0;
    for (const claim of Object.values(data.deliveryClaims || {})) {
      await client.query(
        `INSERT INTO delivery_claims (id, tenant_id, patch_id, worker_id, claimed_at, expires_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (patch_id) DO NOTHING`,
        [
          claim.id,
          claim.tenantId,
          claim.patchId,
          claim.workerId,
          claim.claimedAt,
          claim.expiresAt,
          claim.status,
        ],
      );
      claimCount++;
    }
    tableCounts['delivery_claims'] = claimCount;

    // 15. Webhook Deliveries
    let whCount = 0;
    for (const wh of Object.values(data.webhookDeliveries || {})) {
      await client.query(
        `INSERT INTO webhook_deliveries (id, delivery_id, event, signature, processed_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (delivery_id) DO NOTHING`,
        [wh.id, wh.deliveryId, wh.event, wh.signature, wh.processedAt, wh.status],
      );
      whCount++;
    }
    tableCounts['webhook_deliveries'] = whCount;

    await client.query('COMMIT');

    totalRecordsMigrated = Object.values(tableCounts).reduce((sum, n) => sum + n, 0);

    return {
      success: true,
      backupPath,
      totalRecordsMigrated,
      tableCounts,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
