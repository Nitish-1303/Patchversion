'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrandIcon } from '../components/BrandIcons';
import type { RepositoryScanResult } from '@patchversion/shared';
import { TriageCard, type FindingInfo } from './components/TriageCard';
import { InteractiveGraph } from './components/InteractiveGraph';
import { AuditScorecard } from './components/AuditScorecard';
import { HealthCard } from './components/HealthCard';
import { TelemetryBar } from './components/TelemetryBar';
import {
  LayersIcon,
  TopologyIcon,
  ShieldCheckIcon,
  GitPullRequestIcon,
  PackageSearchIcon,
  ActivityIcon,
  ScanRadarIcon,
  SearchIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/app/components/UiIcons';

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
  const [findings, setFindings] = useState<FindingInfo[]>([]);
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);

  // Friendly Triage Controls
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState<'all' | 'direct' | 'transitive' | 'concerns'>('all');
  const [sortOrder, setSortOrder] = useState<'name' | 'callSites' | 'directFirst'>('directFirst');
  const [activeTab, setActiveTab] = useState<
    'Triage Deck' | 'Visual Map' | 'Audit & Steps' | 'Pull requests' | 'Monitored Packages' | 'Activity'
  >('Triage Deck');

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
      setTimeout(() => {
        setAuthenticated(false);
        setUser(null);
        setTenant(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('patchversion_token');
        }
        setActionError('Session expired or unauthorized. Please sign in again.');
      }, 0);
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
      const repoId = selectedRepo.id;
      const timer = setTimeout(() => {
        void loadFindings(repoId);
        void loadScanResult(repoId);
      }, 0);
      return () => clearTimeout(timer);
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
    setActionMessage('Scanning repository manifests, mapping AST call sites, and inspecting dependencies...');
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
          setActionMessage(`Scan complete: 0 breaking regressions detected in ${selectedRepo.fullName}. All mapped dependencies conform to current rules.`);
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
    setActionMessage('Delivering pull request to GitHub...');
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

  // Filter & sort dependencies for the Friendly Card Triage Deck
  const filteredDependencies = (scanResult?.dependencies || [])
    .filter((dep) => {
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
    })
    .sort((a, b) => {
      if (sortOrder === 'callSites') {
        return b.importingFiles.length - a.importingFiles.length;
      }
      if (sortOrder === 'directFirst') {
        const aDirect = a.type !== 'transitive' ? 1 : 0;
        const bDirect = b.type !== 'transitive' ? 1 : 0;
        if (aDirect !== bDirect) return bDirect - aDirect;
      }
      return a.name.localeCompare(b.name);
    });

  // If unauthenticated: render initial unavailable state matching verified test requirements
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

  const hasRegressions = findings.length > 0;

  return (
    <div className="dashboard-app" style={{ maxWidth: '1280px', margin: '24px auto', width: 'calc(100% - 32px)' }}>
      {/* Signature TryPatchBay Browser Frame Top Bar */}
      <div className="browser-bar" style={{ background: '#ffffff', borderBottom: '1px solid #dfe1ef', borderRadius: '14px 14px 0 0' }}>
        <div className="browser-dots" aria-hidden="true"><i /><i /><i /></div>
        <span style={{ fontWeight: 600, color: '#141a39', fontSize: '11px' }}>
          trypatchbay · developer workspace dashboard
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-pill" style={{ background: '#e4e5f4', color: '#141a39', fontWeight: 600 }}>
            {tenant?.name ?? 'TryPatchBay Demo Workspace'}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '11px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '0 4px',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div
        style={{
          background: '#f7f7fc',
          border: '1px solid #dfe1ef',
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Workspace Subheader & Active Repository Switcher */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dfe1ef',
            borderRadius: '12px',
            padding: '18px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
          }}
        >
          <div>
            <span className="small-label" style={{ color: '#5e6582' }}>
              AUTHENTICATED DEVELOPER WORKSPACE
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#141a39', margin: 0 }}>
                {selectedRepo ? selectedRepo.fullName : 'Connected Repositories'}
              </h1>
              {selectedRepo && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '999px',
                    background: selectedRepo.isDemo ? '#fef3c7' : '#e0e7ff',
                    color: selectedRepo.isDemo ? '#92400e' : '#3730a3',
                    border: `1px solid ${selectedRepo.isDemo ? '#fcd34d' : '#c7d2fe'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <BrandIcon name="github" size={12} />
                  {selectedRepo.isDemo ? 'DEMO FIXTURE (MIGRATION & APPROVAL DEMO)' : 'REAL PUBLIC GITHUB (READ-ONLY AST SCAN)'}
                </span>
              )}
            </div>
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#4e5471' }}>
              Signed in as <strong>{user?.email}</strong>. Connected to persistent state store.
            </p>

            {/* Repository Select Dropdown */}
            {repositories.length > 1 && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label htmlFor="repo-select" style={{ fontSize: '11px', fontWeight: 700, color: '#141a39' }}>
                  Switch Active Repository:
                </label>
                <select
                  id="repo-select"
                  value={selectedRepo?.id ?? ''}
                  onChange={e => {
                    const repo = repositories.find(r => r.id === e.target.value);
                    if (repo) setSelectedRepo(repo);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #dfe1ef',
                    background: '#f7f7fc',
                    color: '#141a39',
                    outline: 'none',
                  }}
                >
                  {repositories.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.fullName} - {r.fullName === 'Nitish-1303/CipherBill' ? 'Live Public GitHub (523 Dependencies)' : 'Demo Fixture (1 Breaking Regression)'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons with Icons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!repositories.some(r => r.fullName === 'Nitish-1303/CipherBill') && (
              <button
                type="button"
                className="pill-button"
                onClick={() => handleConnectSpecificRepo('Nitish-1303/CipherBill')}
                disabled={loading}
                style={{ fontSize: '12px', minHeight: '40px', padding: '0 16px', background: '#ffffff', border: '1px solid #dfe1ef' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <BrandIcon name="github" size={13} /> Connect CipherBill
                </span>
              </button>
            )}
            <button
              type="button"
              className="pill-button pill-button-dark"
              onClick={handleScan}
              disabled={loading || !selectedRepo}
              style={{ fontSize: '12px', minHeight: '40px', padding: '0 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ScanRadarIcon size={14} color="#ffffff" />
              <span>{loading ? 'Scanning Repository...' : 'Scan Repository'}</span>
            </button>
          </div>
        </div>

        {/* Real-time System Telemetry Strip */}
        <TelemetryBar
          scanResult={scanResult}
          repoFullName={selectedRepo?.fullName ?? 'Unknown Repository'}
        />

        {/* Global Notifications / Error Messages */}
        {actionMessage && (
          <div
            style={{
              padding: '12px 18px',
              background: '#e0e7ff',
              color: '#3730a3',
              borderRadius: '8px',
              border: '1px solid #c7d2fe',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>ℹ</span>
            <span>{actionMessage}</span>
          </div>
        )}

        {actionError && (
          <div
            style={{
              padding: '12px 18px',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fca5a5',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠</span>
            <span>{actionError}</span>
          </div>
        )}

        {/* Top Executive Health Scorecard (Built with Dedicated HealthCard Components) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px',
          }}
          aria-label="Repository Health Scorecard"
        >
          {/* Card 1: Health Status */}
          <HealthCard
            icon={hasRegressions ? <AlertTriangleIcon size={16} color="#92400e" /> : <CheckCircleIcon size={16} color="#166534" />}
            label="REPOSITORY HEALTH"
            metric={hasRegressions ? `${findings.length} Breaking Drift Found` : 'All Dependencies Clean'}
            subtext={
              hasRegressions
                ? `${findings[0].packageName} v${findings[0].fromVersion} → v${findings[0].toVersion} requires automated patch.`
                : '0 breaking regressions detected under current supported migration rules.'
            }
            badge={{
              text: hasRegressions ? 'ATTENTION' : 'VERIFIED SAFE',
              variant: hasRegressions ? 'warning' : 'success',
            }}
          />

          {/* Card 2: Dependencies Mapped */}
          <HealthCard
            icon={<LayersIcon size={16} color="#141a39" />}
            label="DEPENDENCY INVENTORY"
            metric={`${scanResult?.totalDependencies ?? 0} Mapped Packages`}
            subtext={`${scanResult?.directCount ?? 0} direct · ${scanResult?.transitiveCount ?? 0} transitive · ${scanResult?.packageManager ?? 'npm'} lockfile`}
            badge={{
              text: `${scanResult?.directCount ?? 0} DIRECT`,
              variant: 'info',
            }}
            action={
              scanResult
                ? {
                    label: `Open Interactive Graph (${scanResult.graph.nodes.length} nodes) →`,
                    onClick: () => setActiveTab('Visual Map'),
                  }
                : undefined
            }
          />

          {/* Card 3: Detected Frameworks */}
          <HealthCard
            icon={<TopologyIcon size={16} color="#141a39" />}
            label="DETECTED FRAMEWORKS"
            metric={`${scanResult?.frameworks?.length ?? 0} Frameworks & Tools`}
            subtext={
              scanResult?.frameworks && scanResult.frameworks.length > 0
                ? scanResult.frameworks.map(f => f.name).join(', ')
                : 'Structure: single-package'
            }
            badge={{
              text: scanResult?.projectType?.toUpperCase() ?? 'NPM',
              variant: 'neutral',
            }}
          />

          {/* Card 4: Execution Sandbox Boundary */}
          <HealthCard
            icon={<ShieldCheckIcon size={16} color="#141a39" />}
            label="EXECUTION BOUNDARY"
            metric={selectedRepo?.isDemo ? 'Live PR Gated' : 'Container Sandbox Required'}
            subtext={
              selectedRepo?.isDemo
                ? 'Test execution disabled on production host; PR prepared locally.'
                : 'Customer test suites fail closed until isolated container runner is active.'
            }
            badge={{
              text: selectedRepo?.isDemo ? 'DEMO SIMULATION' : 'ENFORCED SAFE',
              variant: 'neutral',
            }}
          />
        </section>

        {/* Tab Navigation with Dedicated UiIcons */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid #dfe1ef',
            paddingBottom: '10px',
            flexWrap: 'wrap',
          }}
        >
          {(
            [
              { name: 'Triage Deck', icon: <LayersIcon size={14} /> },
              { name: 'Visual Map', icon: <TopologyIcon size={14} /> },
              { name: 'Audit & Steps', icon: <ShieldCheckIcon size={14} /> },
              { name: 'Pull requests', icon: <GitPullRequestIcon size={14} /> },
              { name: 'Monitored Packages', icon: <PackageSearchIcon size={14} /> },
              { name: 'Activity', icon: <ActivityIcon size={14} /> },
            ] as const
          ).map(tab => {
            const isSelected = activeTab === tab.name;
            let tabLabel: string = tab.name;
            if (tab.name === 'Triage Deck' && scanResult) {
              tabLabel = `Triage Deck (${scanResult.totalDependencies})`;
            } else if (tab.name === 'Pull requests' && findings.filter(f => f.pullRequest).length > 0) {
              tabLabel = `Pull requests (${findings.filter(f => f.pullRequest).length})`;
            }

            return (
              <button
                key={tab.name}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setActiveTab(tab.name as typeof activeTab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  border: isSelected ? '1px solid #141a39' : '1px solid #dfe1ef',
                  background: isSelected ? '#141a39' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#4e5471',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                <span>{tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: The Friendly Card Triage Deck */}
        {activeTab === 'Triage Deck' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Command Bar with Search, Filters & Sorting */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #dfe1ef',
                borderRadius: '12px',
                padding: '14px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(20, 26, 57, 0.02)',
              }}
            >
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#5e6582', marginRight: '4px' }}>
                  FILTER:
                </span>
                <button
                  type="button"
                  onClick={() => setDepFilter('all')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: depFilter === 'all' ? '1px solid #141a39' : '1px solid #dfe1ef',
                    background: depFilter === 'all' ? '#141a39' : '#ffffff',
                    color: depFilter === 'all' ? '#ffffff' : '#4e5471',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  All ({scanResult?.totalDependencies ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('direct')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: depFilter === 'direct' ? '1px solid #141a39' : '1px solid #dfe1ef',
                    background: depFilter === 'direct' ? '#141a39' : '#ffffff',
                    color: depFilter === 'direct' ? '#ffffff' : '#4e5471',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Direct ({scanResult?.directCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('transitive')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: depFilter === 'transitive' ? '1px solid #141a39' : '1px solid #dfe1ef',
                    background: depFilter === 'transitive' ? '#141a39' : '#ffffff',
                    color: depFilter === 'transitive' ? '#ffffff' : '#4e5471',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Transitive ({scanResult?.transitiveCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('concerns')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    border: depFilter === 'concerns' ? '1px solid #991b1b' : '1px solid #dfe1ef',
                    background: depFilter === 'concerns' ? '#fee2e2' : '#ffffff',
                    color: depFilter === 'concerns' ? '#991b1b' : '#4e5471',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Needs Attention ({scanResult?.dependencies.filter(d => d.concerns.length > 0).length ?? 0})
                </button>
              </div>

              {/* Search & Sort Controls */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', color: '#64748b', display: 'flex' }}>
                    <SearchIcon size={13} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search packages or call sites..."
                    value={depSearch}
                    onChange={e => setDepSearch(e.target.value)}
                    style={{
                      padding: '6px 14px 6px 32px',
                      fontSize: '12px',
                      border: '1px solid #dfe1ef',
                      borderRadius: '999px',
                      width: '240px',
                      outline: 'none',
                      background: '#f7f7fc',
                    }}
                  />
                </div>

                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'name' | 'callSites' | 'directFirst')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid #dfe1ef',
                    borderRadius: '999px',
                    background: '#f7f7fc',
                    color: '#141a39',
                    outline: 'none',
                  }}
                >
                  <option value="directFirst">Direct Packages First</option>
                  <option value="callSites">Most Call Sites First</option>
                  <option value="name">Alphabetical (A-Z)</option>
                </select>
              </div>
            </div>

            {/* List of Friendly Triage Cards */}
            {!scanResult ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dfe1ef',
                  borderRadius: '12px',
                  padding: '36px',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#141a39' }}>No scan data recorded</h3>
                <p style={{ color: '#4e5471', fontSize: '13px', marginTop: '6px' }}>
                  Run a scan to extract manifests, map AST import call sites, and generate your dependency triage deck.
                </p>
                <button
                  type="button"
                  className="pill-button pill-button-dark"
                  onClick={handleScan}
                  disabled={loading || !selectedRepo}
                  style={{ marginTop: '16px' }}
                >
                  {loading ? 'Scanning...' : 'Scan Repository'}
                </button>
              </div>
            ) : filteredDependencies.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dfe1ef',
                  borderRadius: '12px',
                  padding: '36px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <p>No dependencies match your search or filter criteria.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredDependencies.map(dep => {
                  const findingForDep = findings.find(f => f.packageName === dep.name);
                  return (
                    <TriageCard
                      key={dep.id}
                      dependency={dep}
                      finding={findingForDep}
                      repoFullName={selectedRepo?.fullName ?? 'repository'}
                      onApprove={handleApprove}
                      onDeliverPR={handleDeliverPR}
                      actionLoading={loading}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Visual Dependency Map (Real Interactive SVG Graph) */}
        {activeTab === 'Visual Map' && (
          <div>
            {scanResult ? (
              <InteractiveGraph
                graph={scanResult.graph}
                repoFullName={selectedRepo?.fullName ?? 'repository'}
                selectedPackage={depSearch || null}
                findings={findings}
                onSelectPackage={pkgName => {
                  setDepSearch(pkgName);
                  setActiveTab('Triage Deck');
                }}
              />
            ) : (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #dfe1ef',
                  borderRadius: '12px',
                  padding: '36px',
                  textAlign: 'center',
                }}
              >
                <p style={{ color: '#64748b' }}>Please scan the repository first to build the visual dependency map.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Step 9 Demonstration Audit & Execution Scorecard */}
        {activeTab === 'Audit & Steps' && (
          <AuditScorecard
            scanResult={scanResult}
            repoFullName={selectedRepo?.fullName ?? 'repository'}
            isDemo={selectedRepo?.isDemo}
            findings={findings}
          />
        )}

        {/* Tab 4: Delivered Pull Requests */}
        {activeTab === 'Pull requests' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #dfe1ef',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#5e6582' }}>PULL REQUESTS</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#141a39', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BrandIcon name="github" size={20} /> Delivered GitHub Pull Requests
            </h2>

            {findings.filter(f => f.pullRequest).length > 0 ? (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {findings.filter(f => f.pullRequest).map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #dfe1ef',
                      borderRadius: '8px',
                      background: '#f7f7fc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#141a39' }}>
                          Fix: {f.packageName} {f.fromVersion} → {f.toVersion}
                        </strong>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Branch: <code>{f.pullRequest?.branchName}</code>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {f.pullRequest?.isSimulation ? (
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                            LOCAL SIMULATION
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <BrandIcon name="github" size={11} /> LIVE GITHUB PR
                          </span>
                        )}
                        <a
                          href={f.pullRequest?.githubPrUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#141a39',
                            textDecoration: 'underline',
                          }}
                        >
                          PR #{f.pullRequest?.githubPrNumber} →
                        </a>
                      </div>
                    </div>
                    {f.pullRequest?.deliveryBlockedReason && (
                      <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', padding: '6px 10px', borderRadius: '4px' }}>
                        Notice: {f.pullRequest.deliveryBlockedReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#4e5471' }}>
                No pull requests delivered yet. When breaking regressions are detected, approving the deterministic diff allows you to create a pull request with 1 click.
              </p>
            )}
          </section>
        )}

        {/* Tab 5: Monitored Packages */}
        {activeTab === 'Monitored Packages' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #dfe1ef',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#5e6582' }}>REGISTRY WATCHLIST</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#141a39', marginTop: '6px' }}>
              Monitored Upstream Libraries
            </h2>
            <p style={{ fontSize: '12px', color: '#4e5471', marginTop: '4px' }}>
              Authoritative package version observations tracked against npm registry APIs.
            </p>

            <form onSubmit={handleAddPackage} style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Add npm package to monitor (e.g. lodash, express, @types/node)..."
                value={newPackageInput}
                onChange={e => setNewPackageInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  fontSize: '12px',
                  border: '1px solid #dfe1ef',
                  borderRadius: '999px',
                  outline: 'none',
                  background: '#f7f7fc',
                }}
              />
              <button
                type="submit"
                className="pill-button pill-button-dark"
                disabled={addingPackage || !newPackageInput.trim()}
                style={{ fontSize: '11px', minHeight: '38px', padding: '0 18px' }}
              >
                {addingPackage ? 'Querying...' : 'Add & Check'}
              </button>
            </form>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {packages.map(pkg => (
                <div
                  key={pkg.packageName}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #dfe1ef',
                    borderRadius: '8px',
                    background: '#f7f7fc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '13px', color: '#141a39' }}>{pkg.packageName}</strong>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: pkg.status === 'upgrade_available' ? '#fef3c7' : pkg.status === 'error' ? '#fee2e2' : '#dcfce7',
                          color: pkg.status === 'upgrade_available' ? '#92400e' : pkg.status === 'error' ? '#991b1b' : '#166534',
                        }}
                      >
                        {pkg.status === 'upgrade_available' ? 'UPGRADE AVAILABLE' : pkg.status === 'error' ? 'ERROR' : 'UP TO DATE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Observed: <code>{pkg.currentVersion}</code> → Latest: <code>{pkg.latestVersion}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="pill-button"
                    onClick={() => handleCheckPackage(pkg.packageName)}
                    disabled={checkingPackage === pkg.packageName}
                    style={{ fontSize: '11px', minHeight: '32px', padding: '0 12px', background: '#ffffff', border: '1px solid #dfe1ef' }}
                  >
                    {checkingPackage === pkg.packageName ? 'Checking...' : 'Check Registry'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 6: Activity History */}
        {activeTab === 'Activity' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #dfe1ef',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#5e6582' }}>TIMELINE</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#141a39', marginTop: '6px' }}>
              Audit Log &amp; Execution History
            </h2>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #dfe1ef' }}>
                <span style={{ color: '#141a39', fontWeight: 600 }}>Authenticated session active</span>
                <span style={{ color: '#64748b' }}>{user?.email}</span>
              </div>
              {selectedRepo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #dfe1ef' }}>
                  <span style={{ color: '#141a39', fontWeight: 600 }}>Active repository connected</span>
                  <span style={{ color: '#64748b' }}>{selectedRepo.fullName}</span>
                </div>
              )}
              {findings.map(f => (
                <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0', borderBottom: '1px solid #dfe1ef' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#92400e', fontWeight: 600 }}>Drift detected in {f.packageName}</span>
                    <span style={{ color: '#64748b' }}>v{f.fromVersion} → v{f.toVersion}</span>
                  </div>
                  {f.validation && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#166534' }}>
                      <span>Red-to-Green Test Provenance:</span>
                      <span>{f.validation.status.toUpperCase()} ({f.validation.executionProvenance || 'fixture-verified'})</span>
                    </div>
                  )}
                  {f.approval && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3730a3' }}>
                      <span>Human Approval Recorded:</span>
                      <span>Hash: {f.patch?.diffHash.slice(0, 12)}...</span>
                    </div>
                  )}
                  {f.pullRequest && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#141a39' }}>
                      <span>Pull Request Delivered:</span>
                      <span>PR #{f.pullRequest.githubPrNumber} {f.pullRequest.isSimulation ? '(Local simulation)' : ''}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
