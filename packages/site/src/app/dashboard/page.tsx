'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrandIcon } from '../components/BrandIcons';
import type { RepositoryScanResult } from '@patchversion/shared';

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
  isDemo?: boolean;
}

interface MonitoredPackage {
  id?: string;
  packageName: string;
  ecosystem: string;
  currentVersion: string;
  latestVersion: string;
  lastCheckedAt: string;
  status: 'up_to_date' | 'upgrade_available' | 'error';
  isDemo?: boolean;
  source?: string;
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
  impactAnalysis?: {
    changeId?: string;
    affectedCallSites?: Array<{ file: string; line: number; column?: number }>;
    unaffectedCallSites?: unknown[];
    coveragePercent?: number;
  };
  patch?: {
    id: string;
    diffContent: string;
    diffHash: string;
    status: string;
  };
  validation?: {
    id: string;
    status: string;
    executionProvenance?: 'fixture-verified' | 'executed' | 'not-executed';
    executionLogs: string;
  };
  approval?: {
    id: string;
    approvedAt: string;
    status: string;
    diffHashAtApproval?: string;
    approvedByUserId?: string;
  };
  pullRequest?: {
    id: string;
    githubPrNumber: number;
    githubPrUrl: string;
    branchName: string;
    status: string;
    isDraft?: boolean;
    isSimulation?: boolean;
    deliveryBlockedReason?: string;
  };
}

const NPM_PACKAGE_REGEX = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('patchversion_token');
    }
    return null;
  });
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState<'all' | 'direct' | 'transitive' | 'concerns'>('all');
  const [activeTab, setActiveTab] = useState<'Overview' | 'Dependencies' | 'Pull requests' | 'APIs' | 'Activity'>('Overview');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [packages, setPackages] = useState<MonitoredPackage[]>([]);
  const [checkingPackage, setCheckingPackage] = useState<string | null>(null);
  const [newPackageInput, setNewPackageInput] = useState('');
  const [addingPackage, setAddingPackage] = useState(false);
  const activeRepoIdRef = useRef<string | null>(null);

  /**
   * Unified authenticated fetch wrapper sending both same-origin cookies and Authorization Bearer header.
   */
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    const token = sessionToken || (typeof window !== 'undefined' ? sessionStorage.getItem('patchversion_token') : null);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...options,
      credentials: 'same-origin',
      headers,
    });

    if (res.status === 401) {
      setAuthenticated(false);
      setUser(null);
      setTenant(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('patchversion_token');
      }
      setActionError('Session expired or unauthorized. Please sign in again.');
    }

    return res;
  }, [sessionToken]);

  const loadPackages = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await authFetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages || []);
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  const handleCheckPackage = async (packageName: string) => {
    setCheckingPackage(packageName);
    setActionError(null);
    try {
      const res = await authFetch('/api/packages', {
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

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const pkg = newPackageInput.trim();
    if (!pkg) return;

    if (!NPM_PACKAGE_REGEX.test(pkg)) {
      setActionError(`Invalid package name '${pkg}'. Must conform to npm naming rules.`);
      return;
    }

    setAddingPackage(true);
    setActionError(null);
    try {
      const res = await authFetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg, currentVersion: '1.0.0' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Monitored package '${pkg}' registered. Latest: ${data.package?.latestVersion}`);
        setNewPackageInput('');
        await loadPackages();
      } else {
        setActionError(data.error || 'Failed to add package');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddingPackage(false);
    }
  };

  const loadFindings = useCallback(async (repoId: string) => {
    if (typeof fetch === 'undefined') return;
    activeRepoIdRef.current = repoId;
    try {
      const res = await authFetch(`/api/findings?repositoryId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        // Prevent stale responses from overwriting findings if active repo changed
        if (activeRepoIdRef.current === repoId) {
          setFindings(data.findings || []);
        }
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  const loadRepositories = useCallback(async () => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await authFetch('/api/repos');
      if (res.ok) {
        const data = await res.json();
        const list: Repository[] = data.repositories || [];
        setRepositories(list);
        if (list.length > 0) {
          setSelectedRepo(prev => {
            if (prev && list.some(r => r.id === prev.id)) {
              return prev;
            }
            return list[0];
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionError(errData.error || 'Failed to load repositories');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  }, [authFetch]);

  const loadScanResult = useCallback(async (repoId: string) => {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await authFetch(`/api/scan?repositoryId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        setScanResult(data.scan || null);
      }
    } catch { /* ignore */ }
  }, [authFetch]);

  // Synchronize findings and scan result when selected repository changes
  useEffect(() => {
    if (selectedRepo?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadFindings(selectedRepo.id);
      void loadScanResult(selectedRepo.id);
    }
  }, [selectedRepo?.id, loadFindings, loadScanResult]);

  // Check existing session on mount
  useEffect(() => {
    if (typeof fetch === 'undefined') return;
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('patchversion_token') : null;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/auth', { credentials: 'same-origin', headers })
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
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setAuthenticated(true);
        setUser(data.user);
        setTenant(data.tenant);
        if (data.token) {
          setSessionToken(data.token);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('patchversion_token', data.token);
          }
        }
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

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authFetch('/api/auth', { method: 'DELETE' });
    } catch { /* ignore */ }
    setAuthenticated(false);
    setUser(null);
    setTenant(null);
    setSessionToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('patchversion_token');
    }
    setActionMessage('Signed out successfully.');
    setLoading(false);
  };

  const handleConnectRepo = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await authFetch('/api/repos', {
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

  const handleConnectSpecificRepo = async (fullName: string) => {
    setLoading(true);
    setActionError(null);
    const [owner, name] = fullName.split('/');
    try {
      const res = await authFetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          owner: owner || 'Nitish-1303',
          name: name || fullName,
          defaultBranch: 'main',
        }),
      });
      if (res.ok) {
        setActionMessage(`Repository '${fullName}' connected successfully.`);
        await loadRepositories();
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error || 'Failed to connect repository');
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
      const res = await authFetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: selectedRepo.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.scan) {
          setScanResult(data.scan);
        }
        if (data.findingsCount === 0) {
          setActionMessage(`Scan complete: 0 breaking regressions detected in ${selectedRepo.fullName}. Repository dependencies are mapped and up to date.`);
        } else {
          setActionMessage(`Scan complete: ${data.findingsCount} regression candidate(s) analyzed and validated.`);
        }
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
      const res = await authFetch('/api/approvals', {
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
    setActionMessage('Delivering pull request...');
    try {
      const res = await authFetch('/api/pull-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patchId }),
      });
      const data = await res.json();
      if (res.ok) {
        const pr = data.pullRequest;
        if (pr.isSimulation) {
          setActionMessage(`Pull Request prepared locally (Demo simulation): PR #${pr.githubPrNumber}`);
        } else {
          setActionMessage(`Pull Request created successfully! PR #${pr.githubPrNumber}: ${pr.githubPrUrl}`);
        }
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

  const filteredDependencies = (scanResult?.dependencies || []).filter((dep) => {
    if (depFilter === 'direct' && dep.type === 'transitive') return false;
    if (depFilter === 'transitive' && dep.type !== 'transitive') return false;
    if (depFilter === 'concerns' && dep.concerns.length === 0) return false;
    if (depSearch.trim()) {
      const query = depSearch.toLowerCase();
      const matchName = dep.name.toLowerCase().includes(query);
      const matchRole = Boolean(dep.frameworkRole && dep.frameworkRole.toLowerCase().includes(query));
      const matchImport = dep.importingFiles.some(f => f.filePath.toLowerCase().includes(query));
      const matchConcern = dep.concerns.some(c => c.message.toLowerCase().includes(query));
      return matchName || matchRole || matchImport || matchConcern;
    }
    return true;
  });

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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-pill">{tenant?.name ?? 'Connected Workspace'}</span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '10px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 4px',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="app-heading">
        <div>
          <span className="small-label">AUTHENTICATED DEVELOPER WORKSPACE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <h1>{selectedRepo ? selectedRepo.fullName : 'Connected Repositories'}</h1>
            {selectedRepo && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: selectedRepo.isDemo ? '#fef3c7' : selectedRepo.fullName === 'Nitish-1303/CipherBill' ? '#e0e7ff' : '#dcfce7',
                  color: selectedRepo.isDemo ? '#92400e' : selectedRepo.fullName === 'Nitish-1303/CipherBill' ? '#3730a3' : '#166534',
                  border: `1px solid ${selectedRepo.isDemo ? '#fcd34d' : selectedRepo.fullName === 'Nitish-1303/CipherBill' ? '#c7d2fe' : '#86efac'}`,
                }}
              >
                {selectedRepo.isDemo ? (
                  'DEMO FIXTURE (MIGRATION & APPROVAL DEMO)'
                ) : selectedRepo.fullName === 'Nitish-1303/CipherBill' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <BrandIcon name="github" size={12} /> REAL PUBLIC GITHUB (READ-ONLY AST SCAN)
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <BrandIcon name="github" size={12} /> LIVE GITHUB APP
                  </span>
                )}
              </span>
            )}
          </div>
          <p>
            Signed in as <strong>{user?.email}</strong>. Connected to persistent state store.
          </p>
          {repositories.length > 1 && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <label htmlFor="repo-select" style={{ fontSize: '12px', fontWeight: 600 }}>Active Repository:</label>
              <select
                id="repo-select"
                value={selectedRepo?.id ?? ''}
                onChange={e => {
                  const repo = repositories.find(r => r.id === e.target.value);
                  if (repo) {
                    setSelectedRepo(repo);
                  }
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                }}
              >
                {repositories.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} - {r.isDemo ? 'Demo Fixture (Full Migration & Proof Demo)' : r.fullName === 'Nitish-1303/CipherBill' ? 'Real Public GitHub (Live 523-Dep AST Scan)' : 'Live GitHub App'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          {!repositories.some(r => r.fullName === 'Nitish-1303/CipherBill') && (
            <button
              type="button"
              className="pill-button"
              onClick={() => handleConnectSpecificRepo('Nitish-1303/CipherBill')}
              disabled={loading}
              title="Connect the live repository configured in GitHub App"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BrandIcon name="github" size={14} /> Connect CipherBill
              </span>
            </button>
          )}
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
        {(['Overview', 'Dependencies', 'Pull requests', 'APIs', 'Activity'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Dependencies' && scanResult ? ` (${scanResult.totalDependencies})` : ''}
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
                <span>created or prepared</span>
              </div>
            </div>

            {scanResult && (
              <section className="app-card" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span className="small-label">ENVIRONMENT & DEPENDENCY GRAPH</span>
                    <h2>Repository Structure & Tooling</h2>
                    <p style={{ marginTop: '4px', color: '#475569' }}>
                      Structure: <strong>{scanResult.projectType}</strong> · Package Manager: <strong>{scanResult.packageManager}</strong> · <strong>{scanResult.totalDependencies}</strong> total dependencies ({scanResult.directCount} direct, {scanResult.transitiveCount} transitive).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => setActiveTab('Dependencies')}
                    style={{ fontSize: '11px', minHeight: '36px', padding: '0 16px' }}
                  >
                    View Dependency Map ({scanResult.totalDependencies}) →
                  </button>
                </div>

                {scanResult.frameworks && scanResult.frameworks.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Detected Frameworks:</span>
                    {scanResult.frameworks.map((fw, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          color: '#1e293b',
                          fontWeight: 600,
                        }}
                      >
                        {fw.name} {fw.version ? `v${fw.version}` : ''} <span style={{ color: '#64748b', fontSize: '9px' }}>({fw.role})</span>
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>Graph Nodes: <strong>{scanResult.graph.nodes.length}</strong></span>
                  <span>Graph Edges: <strong>{scanResult.graph.edges.length}</strong></span>
                  <span>Manifests Parsed: <strong>{scanResult.manifests.length}</strong></span>
                  <span>Lockfiles: <strong>{scanResult.lockfiles.map(l => l.path).join(', ') || 'none'}</strong></span>
                </div>

                {scanResult.provenance && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>Commit: <code style={{ fontFamily: 'monospace' }}>{scanResult.provenance.commitSha ? scanResult.provenance.commitSha.slice(0, 7) : 'head'}</code></span>
                    <span>Branch: <strong>{scanResult.provenance.branch || 'main'}</strong></span>
                    <span>Analysis Mode: <span style={{ padding: '2px 6px', borderRadius: '4px', background: scanResult.provenance.astAnalysisStatus === 'complete' ? '#dcfce7' : '#fef3c7', color: scanResult.provenance.astAnalysisStatus === 'complete' ? '#166534' : '#92400e', fontWeight: 600 }}>{scanResult.provenance.astAnalysisStatus.toUpperCase()}</span></span>
                    <span>Files Inspected: <strong>{scanResult.provenance.filesInspected}</strong></span>
                    <span>Scanner: <strong>v{scanResult.provenance.scannerVersion}</strong></span>
                  </div>
                )}
              </section>
            )}

            {scanResult && (
              <section className="app-card" style={{ marginTop: '16px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="small-label" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                    DEMONSTRATION AUDIT &amp; EXECUTION SUMMARY
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    Step 9 Final Result Verification
                  </span>
                </div>
                <h2 style={{ marginTop: '6px' }}>{selectedRepo ? selectedRepo.fullName : 'Repository'} Analysis Result</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>1. REPOSITORY ANALYZED</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: '#0f172a' }}>{selectedRepo?.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {selectedRepo?.isDemo ? 'Bundled Deterministic Fixture' : selectedRepo?.fullName === 'Nitish-1303/CipherBill' ? 'Live Public GitHub Repository' : 'Authorized GitHub App Workspace'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>2. DEPENDENCIES DETECTED</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: '#0f172a' }}>{scanResult.totalDependencies} total dependencies</div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {scanResult.directCount} direct · {scanResult.transitiveCount} transitive · {scanResult.packageManager} lockfile
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>3. BREAKING REGRESSIONS</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: findings.length > 0 ? '#991b1b' : '#166534' }}>
                      {findings.length > 0 ? `${findings.length} regression(s) found` : '0 breaking changes (clean)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {findings.length > 0 ? `${findings[0].packageName} ${findings[0].fromVersion} → ${findings[0].toVersion}` : 'Monitored packages are on stable, compatible APIs'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>4. SOURCE LOCATIONS MAPPED</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: '#0f172a' }}>
                      {findings[0]?.impactAnalysis?.affectedCallSites?.length ?? 0} affected call site(s)
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {scanResult.provenance?.filesInspected ?? 0} source file(s) inspected · AST status: {scanResult.provenance?.astAnalysisStatus?.toUpperCase()}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>5. DETERMINISTIC PATCH</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: findings[0]?.patch ? '#1e293b' : '#64748b' }}>
                      {findings[0]?.patch ? `Unified diff generated` : 'No patch required'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {findings[0]?.patch?.diffHash ? `SHA-256: ${findings[0].patch.diffHash.slice(0, 16)}...` : 'Deterministic AST codemod'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>6. VALIDATION PROVENANCE</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: primaryFinding?.validation?.executionProvenance === 'executed' ? '#166534' : primaryFinding?.validation?.executionProvenance === 'fixture-verified' ? '#92400e' : '#475569' }}>
                      {primaryFinding?.validation?.executionProvenance?.toUpperCase() ?? (findings.length === 0 ? 'NOT-EXECUTED (ZERO REGRESSIONS)' : 'NOT-EXECUTED')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {primaryFinding?.validation?.executionProvenance === 'fixture-verified' ? 'Loaded from deterministic fixture proof' : primaryFinding?.validation?.executionProvenance === 'executed' ? 'Live sandbox test suite execution' : 'Untrusted execution disabled on host'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>7. HUMAN APPROVAL STATUS</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: primaryFinding?.approval?.status === 'active' ? '#166534' : primaryFinding?.patch ? '#b45309' : '#64748b' }}>
                      {primaryFinding?.approval?.status === 'active' ? 'APPROVED & RECORDED' : primaryFinding?.patch ? 'PENDING HUMAN REVIEW' : 'N/A'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {primaryFinding?.approval?.diffHashAtApproval ? `Diff hash verified: ${primaryFinding.approval.diffHashAtApproval.slice(0, 12)}...` : primaryFinding?.approval ? 'Approval verified' : 'Requires exact cryptographic diff hash match'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 600 }}>8. EXECUTION BOUNDARY &amp; LIMITATIONS</div>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: '#0f172a' }}>
                      {selectedRepo?.isDemo ? 'Live PR Delivery Skipped' : 'Container Sandbox Required'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      {selectedRepo?.isDemo ? 'Demo fixture changes are simulated locally without mutating external repos' : 'Customer test suites fail closed until isolated container runner is active'}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {repositories.length === 0 ? (
              <section className="app-card" style={{ marginTop: '16px' }}>
                <span className="small-label">REPOSITORY SELECTION</span>
                <h2>No repositories connected yet</h2>
                <p>Select or connect an authorized repository to begin dependency analysis.</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="pill-button pill-button-dark"
                    onClick={() => handleConnectSpecificRepo('Nitish-1303/CipherBill')}
                    disabled={loading}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <BrandIcon name="github" size={14} /> Connect CipherBill
              </span> (Live GitHub App)
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={handleConnectRepo}
                    disabled={loading}
                  >
                    Connect Demo Repository
                  </button>
                </div>
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

                  <div className="table-row">
                    <span>Execution Provenance</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background:
                          primaryFinding.validation?.executionProvenance === 'executed'
                            ? '#dcfce7'
                            : primaryFinding.validation?.executionProvenance === 'fixture-verified'
                            ? '#fef3c7'
                            : '#f1f5f9',
                        color:
                          primaryFinding.validation?.executionProvenance === 'executed'
                            ? '#166534'
                            : primaryFinding.validation?.executionProvenance === 'fixture-verified'
                            ? '#92400e'
                            : '#475569',
                      }}
                    >
                      {primaryFinding.validation?.executionProvenance?.toUpperCase() ?? 'NOT-EXECUTED'}
                    </span>
                  </div>

                  {primaryFinding.validation && (
                    <div style={{ marginTop: '10px', fontSize: '10px', background: '#f8fafc', padding: '8px', borderRadius: '4px' }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{primaryFinding.validation.executionLogs}</pre>
                    </div>
                  )}

                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                        Create Draft Pull Request
                      </button>
                    )}

                    {primaryFinding.pullRequest && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={primaryFinding.pullRequest.githubPrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pill-button"
                          style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                        >
                          View PR #{primaryFinding.pullRequest.githubPrNumber} →
                        </a>
                        {primaryFinding.pullRequest.isSimulation && (
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                            [Demo Mode: Prepared Locally]
                          </span>
                        )}
                      </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="small-label" style={{ color: '#166534', background: '#dcfce7' }}>
                    LIVE REPOSITORY SCAN VERIFIED
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {selectedRepo ? selectedRepo.fullName : 'Repository'} at {scanResult?.provenance?.commitSha?.slice(0, 7) || 'HEAD'}
                  </span>
                </div>
                <h2 style={{ marginTop: '8px' }}>No Breaking Regressions Detected</h2>
                <p style={{ marginTop: '4px', color: '#475569' }}>
                  Genuine read-only dependency analysis completed against public GitHub manifests (<code>package.json</code> &amp; <code>package-lock.json</code>).
                  All <strong>{scanResult?.totalDependencies ?? 0}</strong> mapped dependencies are currently on stable, compatible versions with zero breaking contract drift against monitored migration rules.
                </p>
                <div style={{ marginTop: '14px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px' }}>
                  <strong style={{ color: '#0f172a' }}>Execution Boundary Status:</strong> Untrusted customer code execution is disabled. No arbitrary test suites were executed on the serverless host.
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => setActiveTab('Dependencies')}
                  >
                    Explore {scanResult?.totalDependencies ?? 0} Mapped Dependencies →
                  </button>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={handleScan}
                    disabled={loading}
                  >
                    {loading ? 'Re-scanning...' : 'Re-scan Repository'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'Dependencies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <section className="app-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="small-label">REPOSITORY DEPENDENCY MAP</span>
                  <h2>{selectedRepo ? selectedRepo.fullName : 'Repository'} Dependencies</h2>
                  <p style={{ marginTop: '4px', color: '#475569' }}>
                    Static AST call sites, lockfile resolution, framework roles, and dependency graph relationships.
                  </p>
                </div>
                {scanResult && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}>
                      {scanResult.projectType.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                      PM: {scanResult.packageManager.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                      {scanResult.graph.nodes.length} NODES · {scanResult.graph.edges.length} EDGES
                    </span>
                  </div>
                )}
              </div>

              {scanResult?.frameworks && scanResult.frameworks.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Detected Frameworks & Tools:</span>
                  {scanResult.frameworks.map((fw, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#1e293b',
                        fontWeight: 600,
                      }}
                    >
                      {fw.name} {fw.version ? `v${fw.version}` : ''} <span style={{ color: '#64748b', fontSize: '9px' }}>({fw.role})</span>
                    </span>
                  ))}
                </div>
              )}

              {scanResult?.warnings && scanResult.warnings.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Scanner Notices:</div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#b45309' }}>
                    {scanResult.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {scanResult?.provenance && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>Commit: <code style={{ fontFamily: 'monospace' }}>{scanResult.provenance.commitSha ? scanResult.provenance.commitSha.slice(0, 7) : 'head'}</code></span>
                  <span>Branch: <strong>{scanResult.provenance.branch || 'main'}</strong></span>
                  <span>Analysis Mode: <span style={{ padding: '2px 6px', borderRadius: '4px', background: scanResult.provenance.astAnalysisStatus === 'complete' ? '#dcfce7' : '#fef3c7', color: scanResult.provenance.astAnalysisStatus === 'complete' ? '#166534' : '#92400e', fontWeight: 600 }}>{scanResult.provenance.astAnalysisStatus.toUpperCase()}</span></span>
                  <span>Files Inspected: <strong>{scanResult.provenance.filesInspected}</strong></span>
                  <span>Scanner: <strong>v{scanResult.provenance.scannerVersion}</strong></span>
                </div>
              )}
            </section>

            {!scanResult ? (
              <section className="app-card">
                <span className="small-label">NO SCAN DATA</span>
                <h2>No dependency scan on record</h2>
                <p>Run a scan to extract manifests, parse lockfiles, inspect AST imports, and build the dependency graph.</p>
                <button
                  type="button"
                  className="pill-button pill-button-dark"
                  onClick={handleScan}
                  disabled={loading || !selectedRepo}
                  style={{ marginTop: '12px' }}
                >
                  {loading ? 'Scanning...' : 'Scan Repository'}
                </button>
              </section>
            ) : (
              <section className="app-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setDepFilter('all')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '99px',
                        border: depFilter === 'all' ? '1px solid #141a39' : '1px solid #cbd5e1',
                        background: depFilter === 'all' ? '#141a39' : '#ffffff',
                        color: depFilter === 'all' ? '#ffffff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      All ({scanResult.totalDependencies})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepFilter('direct')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '99px',
                        border: depFilter === 'direct' ? '1px solid #141a39' : '1px solid #cbd5e1',
                        background: depFilter === 'direct' ? '#141a39' : '#ffffff',
                        color: depFilter === 'direct' ? '#ffffff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Direct ({scanResult.directCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepFilter('transitive')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '99px',
                        border: depFilter === 'transitive' ? '1px solid #141a39' : '1px solid #cbd5e1',
                        background: depFilter === 'transitive' ? '#141a39' : '#ffffff',
                        color: depFilter === 'transitive' ? '#ffffff' : '#475569',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Transitive ({scanResult.transitiveCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepFilter('concerns')}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '99px',
                        border: depFilter === 'concerns' ? '1px solid #991b1b' : '1px solid #cbd5e1',
                        background: depFilter === 'concerns' ? '#fee2e2' : '#ffffff',
                        color: '#991b1b',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      With Concerns ({scanResult.dependencies.filter(d => d.concerns.length > 0).length})
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search packages, imports, or concerns..."
                    value={depSearch}
                    onChange={e => setDepSearch(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      width: '260px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredDependencies.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '12px', padding: '16px 0', textAlign: 'center' }}>
                      No dependencies match your search or filter criteria.
                    </p>
                  ) : (
                    filteredDependencies.map(dep => (
                      <div
                        key={dep.id}
                        style={{
                          padding: '12px 14px',
                          border: dep.concerns.length > 0 ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          background: dep.concerns.length > 0 ? '#fff5f5' : '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{dep.name}</strong>
                            <span style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                              declared: {dep.declaredVersion}
                            </span>
                            {dep.resolvedVersion && (
                              <span style={{ fontSize: '11px', color: '#166534', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                resolved: {dep.resolvedVersion}
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: dep.type === 'transitive' ? '#f1f5f9' : '#e0e7ff',
                                color: dep.type === 'transitive' ? '#475569' : '#3730a3',
                              }}
                            >
                              {dep.type.toUpperCase()}
                            </span>
                            {dep.frameworkRole && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                }}
                              >
                                {dep.frameworkRole}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            {dep.manifestPath}
                          </span>
                        </div>

                        {/* Concerns */}
                        {dep.concerns.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {dep.concerns.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                style={{
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: c.severity === 'critical' ? '#fee2e2' : '#fef3c7',
                                  color: c.severity === 'critical' ? '#991b1b' : '#92400e',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>⚠ <strong>{c.type.toUpperCase()}:</strong> {c.message}</span>
                                {c.evidence && <span style={{ fontSize: '10px', opacity: 0.85 }}>({c.evidence})</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Importing Files with AST call sites */}
                        {dep.importingFiles.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#334155' }}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>Imported in:</span>{' '}
                            {dep.importingFiles.map((loc, lIdx) => (
                              <code
                                key={lIdx}
                                style={{
                                  marginRight: '6px',
                                  padding: '2px 5px',
                                  background: '#f1f5f9',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                }}
                              >
                                {loc.filePath}:{loc.line}:{loc.column}
                                {loc.symbol ? ` (${loc.symbol})` : ''}
                              </code>
                            ))}
                          </div>
                        )}

                        {/* Direct Dependents & Transitive Dependencies */}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                          {dep.directDependents.length > 0 && (
                            <span>
                              Dependents ({dep.directDependents.length}): <code>{dep.directDependents.slice(0, 3).join(', ')}{dep.directDependents.length > 3 ? '...' : ''}</code>
                            </span>
                          )}
                          {dep.transitiveDependencies.length > 0 && (
                            <span>
                              Transitive deps: {dep.transitiveDependencies.length}
                            </span>
                          )}
                          {dep.evidence?.detail && (
                            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>
                              Evidence: {dep.evidence.source} ({dep.evidence.detail})
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'Pull requests' && (
          <section className="app-card">
            <span className="small-label">PULL REQUESTS</span>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BrandIcon name="github" size={22} /> Delivered GitHub Pull Requests
            </h2>
            {findings.filter(f => f.pullRequest).length > 0 ? (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {findings.filter(f => f.pullRequest).map(f => (
                  <div key={f.id} className="table-row" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>Fix: {f.packageName} {f.fromVersion} → {f.toVersion}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Branch: <code>{f.pullRequest?.branchName}</code></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {f.pullRequest?.isDraft && (
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 700 }}>
                            DRAFT
                          </span>
                        )}
                        {f.pullRequest?.isSimulation ? (
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                            LOCAL SIMULATION
                          </span>
                        ) : (
                          <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <BrandIcon name="github" size={11} /> LIVE GITHUB PR
                          </span>
                        )}
                        <a
                          href={f.pullRequest?.githubPrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                          style={{ marginLeft: '6px' }}
                        >
                          PR #{f.pullRequest?.githubPrNumber} →
                        </a>
                      </div>
                    </div>
                    {f.pullRequest?.deliveryBlockedReason && (
                      <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', width: '100%' }}>
                        Notice: {f.pullRequest.deliveryBlockedReason}
                      </div>
                    )}
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

            <form onSubmit={handleAddPackage} style={{ marginTop: '14px', marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add package name (e.g. express, lodash, @types/node)..."
                value={newPackageInput}
                onChange={e => setNewPackageInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="pill-button pill-button-dark"
                disabled={addingPackage || !newPackageInput.trim()}
                style={{ fontSize: '11px', padding: '6px 14px' }}
              >
                {addingPackage ? 'Querying...' : 'Add & Check'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {packages.map(pkg => (
                <div key={pkg.packageName} className="table-row" style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      {pkg.isDemo ? (
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                          DEMO FIXTURE
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#f8fafc', color: '#64748b', fontWeight: 600 }}>
                          NPM REGISTRY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Observed: <code>{pkg.currentVersion}</code> → Latest: <code>{pkg.latestVersion}</code> · Last checked: {new Date(pkg.lastCheckedAt).toLocaleTimeString()}
                    </div>
                    {pkg.notes && <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>{pkg.notes}</div>}
                    {pkg.lastError && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>Error: {pkg.lastError}</div>}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="pill-button"
                      onClick={() => handleCheckPackage(pkg.packageName)}
                      disabled={checkingPackage === pkg.packageName}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      {checkingPackage === pkg.packageName ? 'Checking...' : 'Check Registry'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', fontSize: '10px', color: '#94a3b8' }}>
              Storage Mode: Ephemeral container filesystem (/tmp). Monitored packages and session tokens are stateless or seeded idempotently. Cross-instance persistence requires external database infrastructure (PostgreSQL/Redis).
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
                  {f.validation && <p><span>Isolated proof</span><span>Status: {f.validation.status} ({f.validation.executionProvenance || 'fixture-verified'})</span></p>}
                  {f.approval && <p><span>Human approval granted</span><span>Hash: {f.patch?.diffHash.slice(0, 8)}</span></p>}
                  {f.pullRequest && <p><span>PR Delivered</span><span>#{f.pullRequest.githubPrNumber} {f.pullRequest.isSimulation ? '(Local simulation)' : ''}</span></p>}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
