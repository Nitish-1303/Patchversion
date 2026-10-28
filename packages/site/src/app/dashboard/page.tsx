'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface UserInfo {
  id: string;
  email: string;
  role: string;
}

interface TenantInfo {
  id: string;
  name: string;
}

interface Repository {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  status: string;
}

interface MonitoredPackage {
  packageName: string;
  ecosystem: string;
  currentVersion: string;
  latestVersion: string;
  lastCheckedAt: string;
  status: 'up_to_date' | 'upgrade_available' | 'error';
  notes?: string;
  lastError?: string;
}

interface Finding {
  id: string;
  packageName: string;
  fromVersion: string;
  toVersion: string;
  isBreaking: boolean;
  status: string;
  patch?: {
    id: string;
    diffContent: string;
    diffHash: string;
    status: string;
  };
  validation?: {
    id: string;
    status: string;
    executionLogs: string;
  };
  approval?: {
    id: string;
    approvedAt: string;
    status: string;
  };
  pullRequest?: {
    id: string;
    githubPrNumber: number;
    githubPrUrl: string;
    branchName: string;
    status: string;
  };
}

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Pull requests' | 'APIs' | 'Activity'>('Overview');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [packages, setPackages] = useState<MonitoredPackage[]>([]);
  const [checkingPackage, setCheckingPackage] = useState<string | null>(null);

  const loadPackages = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch { /* ignore */ }
  }, []);

  const handleCheckPackage = async (packageName: string) => {
    setCheckingPackage(packageName);
    setActionError(null);
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Package ${packageName} checked: latest version is ${data.package?.latestVersion} (${data.package?.status})`);
        await loadPackages();
      } else {
        setActionError(data.error || 'Failed to check package');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setCheckingPackage(null);
    }
  };

  const loadFindings = useCallback(async (repoId: string) => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch(`/api/findings?repositoryId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        setFindings(data.findings || []);
      }
    } catch { /* ignore */ }
  }, []);

  const loadRepositories = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/repos');
      if (res.ok) {
        const data = await res.json();
        setRepositories(data.repositories || []);
        if (data.repositories?.length > 0) {
          const defaultRepo = data.repositories[0];
          setSelectedRepo(defaultRepo);
          loadFindings(defaultRepo.id);
        }
      }
    } catch { /* ignore */ }
  }, [loadFindings]);

  // Check existing session
  useEffect(() => {
    if (typeof fetch === 'undefined') return;
    fetch('/api/auth')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.authenticated) {
          setAuthenticated(true);
          setUser(data.user);
          setTenant(data.tenant);
          loadRepositories();
          loadPackages();
        }
      })
      .catch(() => {});
  }, [loadRepositories, loadPackages]);

  const handleLogin = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'developer@trypatchbay.dev' }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setAuthenticated(true);
        setUser(data.user);
        setTenant(data.tenant);
        await loadRepositories();
        await loadPackages();
        setActionMessage('Authenticated successfully with TryPatchBay developer session.');
      } else {
        setActionError(data.error || 'Login failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectRepo = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'patchbay-demo/checkout-service',
          owner: 'patchbay-demo',
          name: 'checkout-service',
          defaultBranch: 'main',
        }),
      });
      if (res.ok) {
        setActionMessage('Repository connected successfully.');
        await loadRepositories();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    if (!selectedRepo) return;
    setLoading(true);
    setActionError(null);
    setActionMessage('Scanning repository dependencies and validating candidate fixes...');
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: selectedRepo.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Scan complete: ${data.findingsCount} regression candidate(s) analyzed and validated.`);
        await loadFindings(selectedRepo.id);
      } else {
        setActionError(data.error || 'Scan failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (patchId: string, diffHash: string) => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId, diffHash }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage('Diff explicitly approved. Ready for pull request delivery.');
        if (selectedRepo) await loadFindings(selectedRepo.id);
      } else {
        setActionError(data.error || 'Approval failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverPR = async (patchId: string) => {
    setLoading(true);
    setActionError(null);
    setActionMessage('Delivering genuine pull request to GitHub...');
    try {
      const res = await fetch('/api/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Pull Request created successfully! PR #${data.pullRequest.githubPrNumber}: ${data.pullRequest.githubPrUrl}`);
        if (selectedRepo) await loadFindings(selectedRepo.id);
      } else {
        setActionError(data.error || 'PR creation failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // If unauthenticated: render initial unavailable state with action to authenticate
  if (!authenticated) {
    return (
      <section className="login-card" aria-labelledby="dashboard-unavailable-title">
        <span className="eyebrow-chip">WORKSPACE UNAVAILABLE</span>
        <h1 id="dashboard-unavailable-title">Dashboard access is not available yet.</h1>
        <p>Authentication, repository authorization, and persistent workspace data have not been implemented.</p>
        <p>No repository, dependency, validation, activity, or pull request data has been loaded.</p>
        <div style={{ marginTop: '24px' }}>
          <button
            type="button"
            className="pill-button pill-button-dark"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign in with Developer Session'}
          </button>
        </div>
      </section>
    );
  }

  const primaryFinding = findings[0];

  return (
    <div className="dashboard-app">
      <div className="browser-bar">
        <div className="browser-dots" aria-hidden="true"><i /><i /><i /></div>
        <span>trypatchbay · workspace dashboard</span>
        <span className="status-pill">{tenant?.name ?? 'Connected Workspace'}</span>
      </div>

      <div className="app-heading">
        <div>
          <span className="small-label">AUTHENTICATED DEVELOPER WORKSPACE</span>
          <h1>{selectedRepo ? selectedRepo.fullName : 'Connected Repositories'}</h1>
          <p>
            Signed in as <strong>{user?.email}</strong>. Connected to real persistent state store.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="pill-button"
            onClick={handleScan}
            disabled={loading || !selectedRepo}
          >
            {loading ? 'Processing...' : 'Scan Repository'}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{ padding: '10px 18px', background: '#eef2ff', color: '#1e1b4b', fontSize: '11px', fontWeight: 600 }}>
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '10px 18px', background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 600 }}>
          {actionError}
        </div>
      )}

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        {(['Overview', 'Pull requests', 'APIs', 'Activity'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="dashboard-view">
        {activeTab === 'Overview' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="small-label">Connected Repos</span>
                <strong>{repositories.length}</strong>
                <span>active permissions</span>
              </div>
              <div className="stat-card">
                <span className="small-label">Candidate Findings</span>
                <strong>{findings.length}</strong>
                <span>breaking upgrades detected</span>
              </div>
              <div className="stat-card">
                <span className="small-label">Validated Patches</span>
                <strong>{findings.filter(f => f.validation?.status === 'passed').length}</strong>
                <span>verified red-to-green</span>
              </div>
              <div className="stat-card">
                <span className="small-label">Delivered PRs</span>
                <strong>{findings.filter(f => f.pullRequest).length}</strong>
                <span>created on GitHub</span>
              </div>
            </div>

            {repositories.length === 0 ? (
              <section className="app-card" style={{ marginTop: '16px' }}>
                <span className="small-label">REPOSITORY SELECTION</span>
                <h2>No repositories connected yet</h2>
                <p>Select or connect an authorized repository to begin dependency analysis.</p>
                <button
                  type="button"
                  className="pill-button pill-button-dark"
                  onClick={handleConnectRepo}
                  disabled={loading}
                  style={{ marginTop: '12px' }}
                >
                  Connect Disposable Repository
                </button>
              </section>
            ) : primaryFinding ? (
              <div className="dashboard-columns" style={{ marginTop: '16px' }}>
                <section className="app-card">
                  <span className="small-label">DETECTED BREAKING REGRESSION</span>
                  <h2>{primaryFinding.packageName} · {primaryFinding.fromVersion} → {primaryFinding.toVersion}</h2>
                  <p>Breaking contract drift detected. Candidate patch generated and isolated proof executed.</p>

                  <div className="table-row">
                    <span>Validation Status</span>
                    <strong style={{ color: primaryFinding.validation?.status === 'passed' ? '#166534' : '#991b1b' }}>
                      {primaryFinding.validation?.status?.toUpperCase() ?? 'PENDING'}
                    </strong>
                  </div>

                  {primaryFinding.validation && (
                    <div style={{ marginTop: '10px', fontSize: '10px', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{primaryFinding.validation.executionLogs}</pre>
                    </div>
                  )}

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    {primaryFinding.patch && !primaryFinding.approval && primaryFinding.validation?.status === 'passed' && (
                      <button
                        type="button"
                        className="pill-button pill-button-dark"
                        onClick={() => handleApprove(primaryFinding.patch!.id, primaryFinding.patch!.diffHash)}
                        disabled={loading}
                      >
                        Approve Diff ({primaryFinding.patch.diffHash.slice(0, 8)}...)
                      </button>
                    )}

                    {primaryFinding.approval && !primaryFinding.pullRequest && (
                      <button
                        type="button"
                        className="pill-button pill-button-dark"
                        onClick={() => handleDeliverPR(primaryFinding.patch!.id)}
                        disabled={loading}
                      >
                        Create GitHub Pull Request
                      </button>
                    )}

                    {primaryFinding.pullRequest && (
                      <a
                        href={primaryFinding.pullRequest.githubPrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pill-button"
                        style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                      >
                        View PR #{primaryFinding.pullRequest.githubPrNumber} on GitHub →
                      </a>
                    )}
                  </div>
                </section>

                <section className="app-card">
                  <span className="small-label">CANDIDATE FIX DIFF</span>
                  <h2>Review Exact Proposed Patch</h2>
                  {primaryFinding.patch ? (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px' }}>
                        Diff Hash (SHA-256): <code>{primaryFinding.patch.diffHash}</code>
                      </div>
                      <pre style={{
                        background: '#0f172a',
                        color: '#f8fafc',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        overflowX: 'auto',
                        lineHeight: 1.5,
                      }}>
                        {primaryFinding.patch.diffContent}
                      </pre>
                    </div>
                  ) : (
                    <p>No candidate patch generated yet. Run scan to generate.</p>
                  )}
                </section>
              </div>
            ) : (
              <section className="app-card" style={{ marginTop: '16px' }}>
                <span className="small-label">DEPENDENCY SCAN</span>
                <h2>Repository is up to date</h2>
                <p>No unresolved breaking changes detected in currently monitored manifests.</p>
                <button
                  type="button"
                  className="pill-button"
                  onClick={handleScan}
                  disabled={loading}
                  style={{ marginTop: '12px' }}
                >
                  Scan for Dependency Upgrades
                </button>
              </section>
            )}
          </>
        )}

        {activeTab === 'Pull requests' && (
          <section className="app-card">
            <span className="small-label">PULL REQUESTS</span>
            <h2>Delivered GitHub Pull Requests</h2>
            {findings.filter(f => f.pullRequest).length > 0 ? (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {findings.filter(f => f.pullRequest).map(f => (
                  <div key={f.id} className="table-row" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <div>
                      <strong>Fix: {f.packageName} {f.fromVersion} → {f.toVersion}</strong>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Branch: {f.pullRequest?.branchName}</div>
                    </div>
                    <a
                      href={f.pullRequest?.githubPrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link"
                    >
                      PR #{f.pullRequest?.githubPrNumber} →
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p>No pull requests delivered yet. Validate a candidate patch and explicitly approve it to open a PR.</p>
            )}
          </section>
        )}

        {activeTab === 'APIs' && (
          <section className="app-card">
            <span className="small-label">MONITORED DEPENDENCIES</span>
            <h2>Monitored Upstream Libraries</h2>
            <p>Authoritative package version observations tracked across repository manifests.</p>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {packages.map(pkg => (
                <div key={pkg.packageName} className="table-row" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '13px' }}>{pkg.packageName}</strong>
                      <span style={{
                        fontSize: '9px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        background: pkg.status === 'upgrade_available' ? '#fef3c7' : pkg.status === 'error' ? '#fee2e2' : '#dcfce7',
                        color: pkg.status === 'upgrade_available' ? '#92400e' : pkg.status === 'error' ? '#991b1b' : '#166534',
                      }}>
                        {pkg.status === 'upgrade_available' ? 'UPGRADE AVAILABLE' : pkg.status === 'error' ? 'RATE LIMIT / ERROR' : 'UP TO DATE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Observed: <code>{pkg.currentVersion}</code> → Latest: <code>{pkg.latestVersion}</code> · Last checked: {new Date(pkg.lastCheckedAt).toLocaleTimeString()}
                    </div>
                    {pkg.notes && <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px' }}>{pkg.notes}</div>}
                    {pkg.lastError && <div style={{ fontSize: '10px', color: '#dc2626', marginTop: '4px' }}>Error: {pkg.lastError}</div>}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="pill-button"
                      onClick={() => handleCheckPackage(pkg.packageName)}
                      disabled={checkingPackage === pkg.packageName}
                      style={{ fontSize: '10px', padding: '4px 10px' }}
                    >
                      {checkingPackage === pkg.packageName ? 'Checking...' : 'Check Registry'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'Activity' && (
          <section className="app-card">
            <span className="small-label">ACTIVITY TIMELINE</span>
            <h2>Audit Log & Execution History</h2>
            <div className="activity-list" style={{ marginTop: '12px' }}>
              <p><span>Authenticated session</span><span>{user?.email}</span></p>
              {selectedRepo && <p><span>Repository connected</span><span>{selectedRepo.fullName}</span></p>}
              {findings.map(f => (
                <React.Fragment key={f.id}>
                  <p><span>Regression detected</span><span>{f.packageName} {f.fromVersion} → {f.toVersion}</span></p>
                  {f.validation && <p><span>Isolated proof</span><span>Status: {f.validation.status}</span></p>}
                  {f.approval && <p><span>Human approval granted</span><span>Hash: {f.patch?.diffHash.slice(0, 8)}</span></p>}
                  {f.pullRequest && <p><span>PR Delivered</span><span>#{f.pullRequest.githubPrNumber}</span></p>}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
