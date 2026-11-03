'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrandIcon } from '../components/BrandIcons';
import type { RepositoryScanResult } from '@patchversion/shared';
import { TriageCard, type FindingInfo } from './components/TriageCard';
import { InteractiveGraph } from './components/InteractiveGraph';
import { AuditScorecard } from './components/AuditScorecard';
import { HealthCard } from './components/HealthCard';
import { TelemetryBar } from './components/TelemetryBar';
import { PublicDemoCockpit } from './components/PublicDemoCockpit';
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
  GitBranchIcon,
  LockIcon,
  PulseDotIcon,
  TrypatchbayMark,
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

const PROOF_STUDIO_FIXTURES = {
  mockpay: {
    id: 'mockpay',
    name: 'mockpay · 1.0 → 2.0',
    repo: 'acme/payments',
    branch: 'main · sha256:7f160e',
    badge: 'PARAM RENAMED',
    title: 'Parameter renamed',
    summary: 'source becomes payment_method in a bundled example.',
    fromToken: 'source',
    toToken: 'payment_method',
    callsite: 'src/createCharge.js : 42',
    diffDigest: 'Deterministic AST diff · sha256:7f160e',
    diffLines: [
      { num: 40, prefix: ' ', text: 'const options = {', type: 'ctx' },
      { num: 41, prefix: '−', text: '  source: source,', type: 'del' },
      { num: 42, prefix: '+', text: '  payment_method: source,', type: 'add' },
      { num: 43, prefix: ' ', text: "  description: 'Order payment'", type: 'ctx' },
      { num: 44, prefix: ' ', text: '};', type: 'ctx' },
    ],
    brokenLines: [
      { num: 40, prefix: ' ', text: 'const options = {', type: 'ctx' },
      { num: 41, prefix: '!', text: '  source: source, // Missing parameter in v2', type: 'del' },
      { num: 42, prefix: ' ', text: "  description: 'Order payment'", type: 'ctx' },
      { num: 43, prefix: ' ', text: '};', type: 'ctx' },
    ],
    ast: {
      targetNode: 'PropertyAssignment',
      caller: 'mockpay.charges.create({ ... })',
      location: 'src/createCharge.js:4:40',
      rule: 'Deterministic field rename',
      confidence: '100% AST-verified match',
    },
    testLogs: {
      baseline: `PASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (5 ms)\n    √ passes payment source through\n    √ creates a refund (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total`,
      bump: `FAIL src/createCharge.test.js\n  ● createCharge › creates a charge\n\n    Missing required parameter: payment_method\n\n    > 4 | const charge = await mockpay.charges.create({\n        |                                        ^\n      5 |   amount: amount,\n      6 |   currency: currency,\n      7 |   source: source,\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total`,
      verified: `PASS src/createCharge.test.js\n  createCharge\n    √ creates a charge (4 ms)\n    √ passes payment source through\n    √ creates a refund (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nTime:        1.42s`,
    },
  },
  lodash: {
    id: 'lodash',
    name: 'lodash · 3.10 → 4.17',
    repo: 'acme/analytics',
    branch: 'main · sha256:5e7844',
    badge: 'METHOD RENAMED',
    title: 'Function renamed',
    summary: '_.first was removed in v4 and renamed to _.head.',
    fromToken: '_.first',
    toToken: '_.head',
    callsite: 'src/membership.js : 6',
    diffDigest: 'Deterministic AST diff · sha256:5e7844',
    diffLines: [
      { num: 4, prefix: ' ', text: 'function isMember(ids, id) {', type: 'ctx' },
      { num: 5, prefix: '−', text: '  return _.contains(ids, id);', type: 'del' },
      { num: 6, prefix: '+', text: '  return _.includes(ids, id);', type: 'add' },
      { num: 7, prefix: ' ', text: '}', type: 'ctx' },
    ],
    brokenLines: [
      { num: 4, prefix: ' ', text: 'function isMember(ids, id) {', type: 'ctx' },
      { num: 5, prefix: '!', text: '  return _.contains(ids, id); // TypeError in v4', type: 'del' },
      { num: 6, prefix: ' ', text: '}', type: 'ctx' },
    ],
    ast: {
      targetNode: 'CallExpression',
      caller: '_.contains(ids, id)',
      location: 'src/membership.js:6:12',
      rule: 'Deterministic method rename',
      confidence: '100% AST-verified match',
    },
    testLogs: {
      baseline: `PASS src/membership.test.js\n  isMember\n    √ finds a present member (3 ms)\n    √ rejects an absent member\n    √ dedupes (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total`,
      bump: `FAIL src/membership.test.js\n  ● isMember › finds a present member\n\n    TypeError: _.contains is not a function\n\n    > 6 |   return _.contains(ids, id);\n        |            ^\n\nTest Suites: 1 failed, 1 total\nTests:       2 failed, 1 passed, 3 total`,
      verified: `PASS src/membership.test.js\n  isMember\n    √ finds a present member (3 ms)\n    √ rejects an absent member (1 ms)\n    √ dedupes (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       3 passed, 3 total\nTime:        1.28s`,
    },
  },
};

export default function DashboardPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [customRepoInput, setCustomRepoInput] = useState('');
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [findings, setFindings] = useState<FindingInfo[]>([]);
  const [scanResult, setScanResult] = useState<RepositoryScanResult | null>(null);

  // Friendly Triage Controls
  const [depSearch, setDepSearch] = useState('');
  const [depFilter, setDepFilter] = useState<'all' | 'direct' | 'transitive' | 'concerns'>('all');
  const [sortOrder, setSortOrder] = useState<'name' | 'callSites' | 'directFirst'>('directFirst');
  const [activeTab, setActiveTab] = useState<
    'Triage Deck' | 'Proof Studio' | 'Visual Map' | 'Audit & Steps' | 'Pull requests' | 'Monitored Packages' | 'Activity'
  >('Triage Deck');

  // Proof Studio interactive state
  const [proofFixtureKey, setProofFixtureKey] = useState<'mockpay' | 'lodash'>('mockpay');
  const [proofStep, setProofStep] = useState<0 | 1 | 2 | 3>(3);
  const [proofViewTab, setProofViewTab] = useState<'diff' | 'ast' | 'log'>('diff');
  const [proofIsRunning, setProofIsRunning] = useState(false);
  const [proofHumanApproved, setProofHumanApproved] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [packages, setPackages] = useState<MonitoredPackage[]>([]);
  const [checkingPackage, setCheckingPackage] = useState<string | null>(null);
  const [newPackageInput, setNewPackageInput] = useState('');
  const [addingPackage, setAddingPackage] = useState(false);
  const activeRepoIdRef = useRef<string | null>(null);

  const runProofSimulation = () => {
    if (proofIsRunning) return;
    setProofIsRunning(true);
    setProofHumanApproved(false);
    setProofStep(0);
    setTimeout(() => {
      setProofStep(1);
      setTimeout(() => {
        setProofStep(2);
        setTimeout(() => {
          setProofStep(3);
          setProofIsRunning(false);
        }, 600);
      }, 600);
    }, 600);
  };

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
      setActionError(`"${pkg}" is not a valid npm package name. Must be lowercase alphanumeric, optionally scoped like @types/node.`);
      return;
    }
    setAddingPackage(true);
    setActionError(null);
    try {
      const res = await authFetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageName: pkg }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Added and checked ${pkg}: current ${data.package?.currentVersion}, latest ${data.package?.latestVersion}`);
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
    try {
      const res = await authFetch(`/api/findings?repositoryId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        setFindings(data.findings || []);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  const loadInitialScan = useCallback(async (repoId: string) => {
    try {
      const res = await authFetch(`/api/scan?repositoryId=${repoId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.scan) {
          setScanResult(data.scan);
        }
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // Initial Authentication & Repositories Check
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          setAuthenticated(true);
          setUser(data.user);
          setTenant(data.tenant);

          const reposRes = await authFetch('/api/repositories');
          if (reposRes.ok) {
            const reposData = await reposRes.json();
            if (!isMounted) return;
            const fetchedRepos: Repository[] = reposData.repositories || [];
            setRepositories(fetchedRepos);
            if (fetchedRepos.length > 0) {
              const defaultRepo = fetchedRepos.find((r: Repository) => r.fullName === 'Nitish-1303/CipherBill') || fetchedRepos[0];
              setSelectedRepo(defaultRepo);
              activeRepoIdRef.current = defaultRepo.id;
              loadFindings(defaultRepo.id);
              loadInitialScan(defaultRepo.id);
            }
          }
          loadPackages();
        } else {
          if (!isMounted) return;
          setAuthenticated(false);
        }
      } catch {
        if (!isMounted) return;
        setAuthenticated(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [authFetch, loadFindings, loadInitialScan, loadPackages]);

  // Update findings and initial scan when active repo switches
  useEffect(() => {
    if (selectedRepo && selectedRepo.id !== activeRepoIdRef.current) {
      activeRepoIdRef.current = selectedRepo.id;
      loadFindings(selectedRepo.id);
      loadInitialScan(selectedRepo.id);
    }
  }, [selectedRepo, loadFindings, loadInitialScan]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setAuthenticated(false);
    setUser(null);
    setTenant(null);
    setRepositories([]);
    setSelectedRepo(null);
    setFindings([]);
    setScanResult(null);
    sessionStorage.removeItem('patchversion_token');
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setSessionToken(data.token);
        sessionStorage.setItem('patchversion_token', data.token);
        setAuthenticated(true);
        setUser(data.user);
        setTenant(data.tenant);

        const reposRes = await fetch('/api/repositories', {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          const fetchedRepos: Repository[] = reposData.repositories || [];
          setRepositories(fetchedRepos);
          if (fetchedRepos.length > 0) {
            const defaultRepo = fetchedRepos.find((r: Repository) => r.fullName === 'Nitish-1303/CipherBill') || fetchedRepos[0];
            setSelectedRepo(defaultRepo);
            activeRepoIdRef.current = defaultRepo.id;
            loadFindings(defaultRepo.id);
            loadInitialScan(defaultRepo.id);
          }
        }
        await loadPackages();
      } else {
        setActionError(data.error || 'Demo sign in failed');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectSpecificRepo = async (targetRepoFullName: string) => {
    setLoading(true);
    setActionError(null);
    setActionMessage(`Connecting ${targetRepoFullName} to workspace...`);
    try {
      const parts = targetRepoFullName.split('/');
      const owner = parts[0];
      const name = parts[1];
      const res = await authFetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: targetRepoFullName,
          owner,
          name,
          defaultBranch: 'main',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Repository ${targetRepoFullName} connected! Triggering read-only AST dependency scan...`);
        const reposRes = await authFetch('/api/repositories');
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          const fetchedRepos: Repository[] = reposData.repositories || [];
          setRepositories(fetchedRepos);
          const found = fetchedRepos.find(r => r.fullName === targetRepoFullName);
          if (found) {
            setSelectedRepo(found);
            activeRepoIdRef.current = found.id;
            const scanRes = await authFetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ repositoryId: found.id }),
            });
            const scanData = await scanRes.json();
            if (scanRes.ok && scanData.scan) {
              setScanResult(scanData.scan);
              setActionMessage(`Scan complete: ${scanData.scan.totalDependencies} dependencies mapped for ${targetRepoFullName}.`);
            }
            await loadFindings(found.id);
          }
        }
      } else {
        setActionError(data.error || 'Failed to connect repository');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCustomRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const repoStr = customRepoInput.trim();
    if (!repoStr || !repoStr.includes('/')) {
      setActionError('Please enter a valid repository full name, e.g. "owner/repo"');
      return;
    }
    await handleConnectSpecificRepo(repoStr);
    setCustomRepoInput('');
    setShowConnectModal(false);
  };

  const handleInstallGitHubApp = async () => {
    setOnboardingLoading(true);
    setActionError(null);
    try {
      const res = await authFetch('/api/github/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.installUrl) {
        window.location.href = data.installUrl;
      } else {
        setActionError(data.error || 'Failed to generate GitHub App installation link');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setOnboardingLoading(false);
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
        return matchName || matchRole || matchImport;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'directFirst') {
        const aDirect = a.type !== 'transitive' ? 1 : 0;
        const bDirect = b.type !== 'transitive' ? 1 : 0;
        if (aDirect !== bDirect) return bDirect - aDirect;
        return a.name.localeCompare(b.name);
      }
      if (sortOrder === 'callSites') {
        return b.importingFiles.length - a.importingFiles.length;
      }
      return a.name.localeCompare(b.name);
    });

  const activeFixture = PROOF_STUDIO_FIXTURES[proofFixtureKey];

  // If not authenticated, open public YC demo workspace with developer sign-in options
  if (authenticated === false) {
    return (
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Developer Workspace Access Header */}
        <div
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <TrypatchbayMark size={42} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                  TryPatchBay Developer Workspace
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, monospace',
                    background: 'rgba(37, 99, 235, 0.08)',
                    color: '#2563eb',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  PUBLIC DEMO WORKSPACE
                </span>
              </div>
              <p style={{ color: '#475569', fontSize: '13px', marginTop: '4px', lineHeight: 1.4, margin: 0 }}>
                Sign in to inspect your repositories, map AST call sites, and verify automated pull requests.
              </p>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Live persistent state store · HMAC cookie authenticated
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="/api/auth/github/login"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              <BrandIcon name="github" size={16} />
              Continue with GitHub
            </a>
            <button
              type="button"
              className="pill-button pill-button-dark"
              onClick={handleDemoSignIn}
              disabled={loading}
              style={{
                fontSize: '13px',
                padding: '8px 18px',
                minHeight: '38px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: '1px solid rgba(37, 99, 235, 0.4)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                color: '#ffffff',
                fontWeight: 600,
              }}
            >
              {loading ? 'Initializing Workspace...' : 'Sign in to Developer Workspace'}
            </button>
          </div>
        </div>

        {/* Public Demo Cockpit with genuine Lodash migration proof */}
        <PublicDemoCockpit authenticated={false} onSignInClick={handleDemoSignIn} />
      </div>
    );
  }

  const hasRegressions = findings.some(f => f.isBreaking);

  return (
    <div className="content-width" style={{ padding: '32px 0 80px' }}>
      {/* Top Studio Browser Frame */}
      <div
        className="browser-bar"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px 14px 0 0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="browser-dots" aria-hidden="true" style={{ display: 'flex', gap: '6px' }}>
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
            <i style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '999px',
              padding: '3px 12px',
              fontSize: '11px',
              color: '#334155',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            <LockIcon size={10} color="#64748b" />
            <span style={{ color: '#64748b' }}>app.trypatchbay.dev</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {selectedRepo ? selectedRepo.fullName : 'Nitish-1303/CipherBill'}
            </span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ color: '#2563eb' }}>triage</span>
            <span
              style={{
                fontSize: '9px',
                padding: '1px 4px',
                borderRadius: '4px',
                background: '#e2e8f0',
                color: '#475569',
                marginLeft: '4px',
              }}
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* Studio Status & Profile Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofFixtureKey('mockpay');
                setProofHumanApproved(false);
              }}
              style={{
                background: proofFixtureKey === 'mockpay' && activeTab === 'Proof Studio' ? '#0f172a' : 'transparent',
                color: proofFixtureKey === 'mockpay' && activeTab === 'Proof Studio' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              mockpay
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofFixtureKey('lodash');
                setProofHumanApproved(false);
              }}
              style={{
                background: proofFixtureKey === 'lodash' && activeTab === 'Proof Studio' ? '#0f172a' : 'transparent',
                color: proofFixtureKey === 'lodash' && activeTab === 'Proof Studio' ? '#ffffff' : '#475569',
                border: 'none',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              lodash
            </button>
          </div>

          <span
            style={{
              fontSize: '10px',
              fontFamily: 'ui-monospace, monospace',
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <GitBranchIcon size={11} color="#64748b" />
            main · sha256:{scanResult?.provenance?.commitSha?.slice(0, 7) || '5f160dc'}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
              background: selectedRepo?.isDemo ? '#fffbeb' : '#ecfdf5',
              color: selectedRepo?.isDemo ? '#92400e' : '#065f46',
              border: `1px solid ${selectedRepo?.isDemo ? '#fde68a' : '#a7f3d0'}`,
            }}
          >
            <PulseDotIcon color={selectedRepo?.isDemo ? '#f59e0b' : '#10b981'} size={6} />
            {selectedRepo?.isDemo ? 'BUNDLED FIXTURE · LOCAL RUN' : 'REAL PUBLIC GITHUB (READ-ONLY)'}
          </span>

          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#475569',
              padding: '2px 8px',
              borderRadius: '6px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
          >
            {tenant?.name || 'Workspace'}
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          borderRadius: '0 0 14px 14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
        }}
      >
        {/* Workspace Stepper & Quick Action Bar */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Stepper Stages */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofStep(0);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: proofStep === 0 && activeTab === 'Proof Studio' ? '#0f172a' : '#ffffff',
                color: proofStep === 0 && activeTab === 'Proof Studio' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              01 Baseline (Green)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofStep(1);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                background: proofStep === 1 && activeTab === 'Proof Studio' ? '#ef4444' : '#fef2f2',
                color: proofStep === 1 && activeTab === 'Proof Studio' ? '#ffffff' : '#991b1b',
                cursor: 'pointer',
              }}
            >
              02 Upgrade (Red)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofStep(2);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: proofStep === 2 && activeTab === 'Proof Studio' ? '#0f172a' : '#ffffff',
                color: proofStep === 2 && activeTab === 'Proof Studio' ? '#ffffff' : '#334155',
                cursor: 'pointer',
              }}
            >
              03 AST Patch
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                setProofStep(3);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #2563eb',
                background: proofStep === 3 && activeTab === 'Proof Studio' ? '#2563eb' : '#eff6ff',
                color: proofStep === 3 && activeTab === 'Proof Studio' ? '#ffffff' : '#1e40af',
                cursor: 'pointer',
              }}
            >
              04 Verified (Green)
            </button>
          </div>

          {/* Action Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('Proof Studio');
                runProofSimulation();
              }}
              disabled={proofIsRunning}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                cursor: proofIsRunning ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(15, 23, 42, 0.1)',
              }}
            >
              <span>▶</span>
              <span>{proofIsRunning ? 'Simulating Proof Loop...' : 'Run Proof Loop'}</span>
            </button>
          </div>
        </div>

        {/* Subtitle Telemetry Notice */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginTop: '-8px' }}>
          <span>
            {selectedRepo?.isDemo
              ? 'Bundled fixture only · no live repository watching'
              : `Active Repository: ${selectedRepo?.fullName || 'Nitish-1303/CipherBill'}`}
          </span>
          <span>Deterministic AST Engine · Safe Execution Boundary</span>
        </div>

        {/* Repository Header Details & Selector */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <ShieldCheckIcon size={12} color="#64748b" />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase' }}>
                AUTHENTICATED DEVELOPER WORKSPACE
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {selectedRepo ? selectedRepo.fullName : 'Nitish-1303/CipherBill'}
              </h1>
              {selectedRepo && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: selectedRepo.isDemo ? '#fffbeb' : '#eff6ff',
                    color: selectedRepo.isDemo ? '#92400e' : '#1e40af',
                    border: `1px solid ${selectedRepo.isDemo ? '#fde68a' : '#bfdbfe'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <BrandIcon name="github" size={11} />
                  <span>{selectedRepo.isDemo ? 'Demo Fixture (Migration & Approval Demo)' : 'Real Public GitHub (Read-Only AST Scan)'}</span>
                </span>
              )}
            </div>
            <p style={{ marginTop: '4px', fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
              Signed in as <strong style={{ color: '#0f172a' }}>{user?.email}</strong>. Connected to persistent state store.
            </p>

            {/* Repository Select Dropdown */}
            {repositories.length > 1 && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <label htmlFor="repo-select" style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
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
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setShowConnectModal(!showConnectModal)}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                minHeight: '38px',
                padding: '0 14px',
                background: showConnectModal ? '#eff6ff' : '#ffffff',
                border: showConnectModal ? '1px solid #2563eb' : '1px solid #cbd5e1',
                borderRadius: '8px',
                color: showConnectModal ? '#1e40af' : '#0f172a',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
            >
              <TopologyIcon size={13} color={showConnectModal ? '#1e40af' : '#475569'} />
              <span>{showConnectModal ? 'Close Connect Panel' : '+ Connect Repository'}</span>
            </button>

            {!repositories.some(r => r.fullName === 'Nitish-1303/CipherBill') && (
              <button
                type="button"
                onClick={() => handleConnectSpecificRepo('Nitish-1303/CipherBill')}
                disabled={loading}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  minHeight: '38px',
                  padding: '0 14px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#0f172a',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                }}
              >
                <BrandIcon name="github" size={13} />
                <span>Connect CipherBill</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleScan}
              disabled={loading || !selectedRepo}
              style={{
                fontSize: '12px',
                fontWeight: 600,
                minHeight: '38px',
                padding: '0 18px',
                background: '#0f172a',
                border: '1px solid #0f172a',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <ScanRadarIcon size={13} color="#ffffff" />
              <span>{loading ? 'Scanning...' : 'Scan Repository'}</span>
            </button>
          </div>
        </div>

        {/* Connect Modal Panel */}
        {showConnectModal && (
          <div
            style={{
              padding: '20px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid #2563eb',
              boxShadow: '0 4px 20px rgba(37, 99, 235, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Connect an Authorized Repository</strong>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                  Authorize your GitHub repositories or link an existing verified installation to your workspace.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInstallGitHubApp}
                disabled={onboardingLoading}
                className="pill-button"
                style={{ fontSize: '11px', minHeight: '34px', padding: '0 12px', background: '#f8fafc', border: '1px solid #cbd5e1' }}
              >
                <BrandIcon name="github" size={12} />
                <span style={{ marginLeft: 6 }}>{onboardingLoading ? 'Generating link...' : 'Install GitHub App ↗'}</span>
              </button>
            </div>
            <form onSubmit={handleConnectCustomRepo} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="owner/repository-name (e.g., acme/payments)"
                value={customRepoInput}
                onChange={e => setCustomRepoInput(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '260px',
                  height: '38px',
                  padding: '0 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
              <button
                type="submit"
                disabled={loading || !customRepoInput.trim()}
                className="pill-button pill-button-dark"
                style={{ fontSize: '12px', minHeight: '38px', padding: '0 16px' }}
              >
                Connect Repository
              </button>
            </form>
          </div>
        )}

        {/* Real-time System Telemetry Strip */}
        <TelemetryBar
          scanResult={scanResult}
          repoFullName={selectedRepo?.fullName ?? 'Unknown Repository'}
        />

        {/* Global Notifications / Error Messages */}
        {actionMessage && (
          <div
            style={{
              padding: '10px 16px',
              background: '#eff6ff',
              color: '#1e40af',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
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
              padding: '10px 16px',
              background: '#fef2f2',
              color: '#991b1b',
              borderRadius: '8px',
              border: '1px solid #fecaca',
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

        {/* Top Executive Health Scorecard */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '14px',
          }}
          aria-label="Repository Health Scorecard"
        >
          {/* Card 1: Health Status */}
          <HealthCard
            icon={hasRegressions ? <AlertTriangleIcon size={16} color="#92400e" /> : <CheckCircleIcon size={16} color="#059669" />}
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
            icon={<LayersIcon size={16} color="#0f172a" />}
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
            icon={<TopologyIcon size={16} color="#0f172a" />}
            label="DETECTED FRAMEWORKS"
            metric={`${scanResult?.frameworks?.length ?? 0} Frameworks & Tools`}
            subtext={
              scanResult?.frameworks && scanResult.frameworks.length > 0
                ? scanResult.frameworks.map(f => f.name).join(', ')
                : 'Structure: single-package'
            }
            badge={{
              text: scanResult?.projectType?.toUpperCase() ?? 'SINGLE-PACKAGE',
              variant: 'neutral',
            }}
          />

          {/* Card 4: Execution Sandbox Boundary */}
          <HealthCard
            icon={<ShieldCheckIcon size={16} color="#0f172a" />}
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

        {/* Refined Segmented Tab Bar */}
        <div
          role="tablist"
          aria-label="Dashboard sections"
          style={{
            display: 'flex',
            gap: '4px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          {(
            [
              { name: 'Triage Deck', icon: <LayersIcon size={14} /> },
              { name: 'Proof Studio', icon: <ScanRadarIcon size={14} /> },
              { name: 'Visual Map', icon: <TopologyIcon size={14} /> },
              { name: 'Audit & Steps', icon: <ShieldCheckIcon size={14} /> },
              { name: 'Pull requests', icon: <GitPullRequestIcon size={14} /> },
              { name: 'Monitored Packages', icon: <PackageSearchIcon size={14} /> },
              { name: 'Activity', icon: <ActivityIcon size={14} /> },
            ] as const
          ).map(tab => {
            const isSelected = activeTab === tab.name;
            const tabLabel: string = tab.name;
            let countBadge: number | null = null;
            if (tab.name === 'Triage Deck' && scanResult) {
              countBadge = scanResult.totalDependencies;
            } else if (tab.name === 'Pull requests' && findings.filter(f => f.pullRequest).length > 0) {
              countBadge = findings.filter(f => f.pullRequest).length;
            }

            return (
              <button
                key={tab.name}
                role="tab"
                aria-selected={isSelected}
                type="button"
                onClick={() => setActiveTab(tab.name as typeof activeTab)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                  background: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? '#0f172a' : '#64748b',
                  fontSize: '12px',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isSelected ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', color: isSelected ? '#0f172a' : '#94a3b8' }}>
                  {tab.icon}
                </span>
                <span>{tabLabel}</span>
                {countBadge !== null && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: isSelected ? '#f1f5f9' : '#e2e8f0',
                      color: isSelected ? '#0f172a' : '#64748b',
                    }}
                  >
                    {countBadge}
                  </span>
                )}
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
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
              }}
            >
              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                  FILTER:
                </span>
                <button
                  type="button"
                  onClick={() => setDepFilter('all')}
                  style={{
                    padding: '4px 12px',
                    border: depFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: depFilter === 'all' ? '#0f172a' : '#f8fafc',
                    color: depFilter === 'all' ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  All ({scanResult?.totalDependencies ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('direct')}
                  style={{
                    padding: '4px 12px',
                    border: depFilter === 'direct' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: depFilter === 'direct' ? '#0f172a' : '#f8fafc',
                    color: depFilter === 'direct' ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  Direct ({scanResult?.directCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('transitive')}
                  style={{
                    padding: '4px 12px',
                    border: depFilter === 'transitive' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: depFilter === 'transitive' ? '#0f172a' : '#f8fafc',
                    color: depFilter === 'transitive' ? '#ffffff' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '6px',
                  }}
                >
                  Transitive ({scanResult?.transitiveCount ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setDepFilter('concerns')}
                  style={{
                    padding: '4px 12px',
                    border: depFilter === 'concerns' ? '1px solid #b91c1c' : '1px solid #e2e8f0',
                    background: depFilter === 'concerns' ? '#fef2f2' : '#f8fafc',
                    color: depFilter === 'concerns' ? '#b91c1c' : '#475569',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    borderRadius: '6px',
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
                      border: '1px solid #cbd5e1',
                      borderRadius: '999px',
                      width: '240px',
                      outline: 'none',
                      background: '#f8fafc',
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
                    border: '1px solid #cbd5e1',
                    borderRadius: '999px',
                    background: '#f8fafc',
                    color: '#0f172a',
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
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '36px',
                  textAlign: 'center',
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>No scan data recorded</h3>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '6px' }}>
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
                  border: '1px solid #e2e8f0',
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

        {/* Tab 2: The Redesigned Proof Studio (Exact 3-Column Change Review from Reference) */}
        {activeTab === 'Proof Studio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header with Title and Badges */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', textTransform: 'uppercase' }}>
                  CHANGE REVIEW
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
                  {activeFixture.name}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid #a7f3d0',
                    background: '#ecfdf5',
                    color: '#065f46',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span>↻</span>
                  <span>AST Detected</span>
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <LockIcon size={11} color="#64748b" />
                  <span>Local fixture</span>
                </span>
              </div>
            </div>

            {/* 3-Column Change Review Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Column 1: CHANGE / PARAM RENAMED */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase' }}>
                      CHANGE
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: '#fffbeb',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                      }}
                    >
                      ⚠ {activeFixture.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                    {activeFixture.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
                    {activeFixture.summary}
                  </p>

                  {/* Token Box Arrow Diagram */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '12px',
                    }}
                  >
                    <span
                      style={{
                        padding: '3px 8px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        color: '#334155',
                      }}
                    >
                      {activeFixture.fromToken}
                    </span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>→</span>
                    <span
                      style={{
                        padding: '3px 8px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '5px',
                        color: '#1e40af',
                        fontWeight: 600,
                      }}
                    >
                      {activeFixture.toToken}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>
                  <span>📄 Example call site · </span>
                  <code style={{ color: '#0f172a' }}>{activeFixture.callsite}</code>
                </div>
              </div>

              {/* Column 2: The Dark Terminal IDE (Central Code Window) */}
              <div
                style={{
                  background: '#0d1117',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Dark Window Header */}
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#161b22',
                    borderBottom: '1px solid #21262d',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace', color: '#e6edf3', fontWeight: 600 }}>
                      {activeFixture.callsite}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setProofViewTab('diff')}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: proofViewTab === 'diff' ? '#21262d' : 'transparent',
                        color: proofViewTab === 'diff' ? '#ffffff' : '#8b949e',
                        cursor: 'pointer',
                      }}
                    >
                      Diff
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofViewTab('ast')}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: proofViewTab === 'ast' ? '#21262d' : 'transparent',
                        color: proofViewTab === 'ast' ? '#ffffff' : '#8b949e',
                        cursor: 'pointer',
                      }}
                    >
                      AST
                    </button>
                    <button
                      type="button"
                      onClick={() => setProofViewTab('log')}
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: proofViewTab === 'log' ? '#21262d' : 'transparent',
                        color: proofViewTab === 'log' ? '#ffffff' : '#8b949e',
                        cursor: 'pointer',
                      }}
                    >
                      Log
                    </button>
                  </div>
                </div>

                {/* Code Window Body */}
                <div style={{ padding: '14px', flex: 1 }}>
                  {proofViewTab === 'diff' && (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                        fontSize: '11px',
                        lineHeight: 1.6,
                        color: '#c9d1d9',
                        overflowX: 'auto',
                      }}
                    >
                      {(proofStep === 1 ? activeFixture.brokenLines : activeFixture.diffLines).map(line => {
                        let lineBg = 'transparent';
                        let textColor = '#c9d1d9';
                        if (line.type === 'del') {
                          lineBg = 'rgba(239, 68, 68, 0.15)';
                          textColor = '#f87171';
                        } else if (line.type === 'add') {
                          lineBg = 'rgba(34, 197, 94, 0.15)';
                          textColor = '#4ade80';
                        }
                        return (
                          <div
                            key={line.num}
                            style={{
                              background: lineBg,
                              padding: '1px 6px',
                              borderRadius: '2px',
                              display: 'flex',
                              gap: '10px',
                            }}
                          >
                            <span style={{ color: '#484f58', minWidth: '20px', textAlign: 'right', userSelect: 'none' }}>
                              {line.num}
                            </span>
                            <span style={{ color: textColor, minWidth: '12px', userSelect: 'none' }}>
                              {line.prefix}
                            </span>
                            <span style={{ color: textColor }}>{line.text}</span>
                          </div>
                        );
                      })}
                    </pre>
                  )}

                  {proofViewTab === 'ast' && (
                    <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#58a6ff', lineHeight: 1.6 }}>
                      <div>Node Target: <strong style={{ color: '#ffffff' }}>{activeFixture.ast.targetNode}</strong></div>
                      <div>Caller Match: <span style={{ color: '#7ee787' }}>{activeFixture.ast.caller}</span></div>
                      <div>Rule Provenance: <span style={{ color: '#ffa657' }}>{activeFixture.ast.rule}</span></div>
                      <div>Confidence: <span style={{ color: '#7ee787' }}>{activeFixture.ast.confidence}</span></div>
                      <div style={{ marginTop: '8px', color: '#8b949e' }}>Source File: {activeFixture.ast.location}</div>
                    </div>
                  )}

                  {proofViewTab === 'log' && (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '10px',
                        lineHeight: 1.5,
                        color: proofStep === 1 ? '#f87171' : '#7ee787',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {proofStep === 0 && activeFixture.testLogs.baseline}
                      {proofStep === 1 && activeFixture.testLogs.bump}
                      {proofStep >= 2 && activeFixture.testLogs.verified}
                    </pre>
                  )}
                </div>

                {/* Dark Window Footer */}
                <div
                  style={{
                    padding: '8px 14px',
                    background: '#161b22',
                    borderTop: '1px solid #21262d',
                    fontSize: '10px',
                    fontFamily: 'ui-monospace, monospace',
                    color: '#8b949e',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{activeFixture.diffDigest}</span>
                  <span style={{ color: '#3fb950' }}>Deterministic AST</span>
                </div>
              </div>

              {/* Column 3: LOCAL FIXTURE CHECK / VERIFICATION */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: '#64748b', textTransform: 'uppercase' }}>
                      LOCAL FIXTURE CHECK
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircleIcon size={10} color="#059669" />
                      VERIFIED
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
                    Proof stays reviewable
                  </h3>

                  {/* Status checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                        <span style={{ fontSize: '12px', color: '#334155' }}>Before patch</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                        2 failing
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#ecfdf5',
                        borderRadius: '8px',
                        border: '1px solid #a7f3d0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 600 }}>After patch</span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                        ✔ 3 / 3 passing
                      </span>
                    </div>
                  </div>

                  {/* Simulate Human Approval Button */}
                  <button
                    type="button"
                    onClick={() => setProofHumanApproved(!proofHumanApproved)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: proofHumanApproved ? '1px solid #059669' : '1px solid #cbd5e1',
                      background: proofHumanApproved ? '#ecfdf5' : '#ffffff',
                      color: proofHumanApproved ? '#065f46' : '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{proofHumanApproved ? '✔ Diff Approved (Hash Bound)' : '✔ Simulate Human Approval Gate'}</span>
                  </button>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', fontSize: '10px', color: '#64748b', lineHeight: 1.5 }}>
                  <div>Example fixture output · not a live run</div>
                  <div style={{ color: '#059669', fontWeight: 600 }}>Isolated sandbox runner</div>
                </div>
              </div>
            </div>

            {/* Bottom Status strip */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#64748b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>Local proof engine ready</span>
              </div>
              <span>Reviewable diff · verified test execution loop</span>
            </div>
          </div>
        )}

        {/* Tab 3: Visual Dependency Map */}
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
                  border: '1px solid #e2e8f0',
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

        {/* Tab 4: Step 9 Demonstration Audit & Execution Scorecard */}
        {activeTab === 'Audit & Steps' && (
          <AuditScorecard
            scanResult={scanResult}
            repoFullName={selectedRepo?.fullName ?? 'repository'}
            isDemo={selectedRepo?.isDemo}
            findings={findings}
          />
        )}

        {/* Tab 5: Delivered Pull Requests */}
        {activeTab === 'Pull requests' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#64748b' }}>PULL REQUESTS</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BrandIcon name="github" size={20} /> Delivered GitHub Pull Requests
            </h2>

            {findings.filter(f => f.pullRequest).length > 0 ? (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {findings.filter(f => f.pullRequest).map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
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
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
                            color: '#0f172a',
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
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                No pull requests delivered yet. When breaking regressions are detected, approving the deterministic diff allows you to create a pull request with 1 click.
              </p>
            )}
          </section>
        )}

        {/* Tab 6: Monitored Packages */}
        {activeTab === 'Monitored Packages' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#64748b' }}>REGISTRY WATCHLIST</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Monitored Upstream Libraries
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
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
                  border: '1px solid #cbd5e1',
                  borderRadius: '999px',
                  outline: 'none',
                  background: '#f8fafc',
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
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <BrandIcon name={pkg.packageName === "lodash" ? "lodash" : "npm"} size={15} useBrandColor />
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{pkg.packageName}</strong>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: pkg.status === 'upgrade_available' ? '#fffbeb' : pkg.status === 'error' ? '#fef2f2' : '#ecfdf5',
                          color: pkg.status === 'upgrade_available' ? '#92400e' : pkg.status === 'error' ? '#991b1b' : '#065f46',
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
                    style={{ fontSize: '11px', minHeight: '32px', padding: '0 12px', background: '#ffffff', border: '1px solid #cbd5e1' }}
                  >
                    {checkingPackage === pkg.packageName ? 'Checking...' : 'Check Registry'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab 7: Activity History */}
        {activeTab === 'Activity' && (
          <section
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
            }}
          >
            <span className="small-label" style={{ color: '#64748b' }}>TIMELINE</span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
              Audit Log &amp; Execution History
            </h2>
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>Authenticated session active</span>
                <span style={{ color: '#64748b' }}>{user?.email}</span>
              </div>
              {selectedRepo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>Active repository connected</span>
                  <span style={{ color: '#64748b' }}>{selectedRepo.fullName}</span>
                </div>
              )}
              {findings.map(f => (
                <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#92400e', fontWeight: 600 }}>Drift detected in {f.packageName}</span>
                    <span style={{ color: '#64748b' }}>v{f.fromVersion} → v{f.toVersion}</span>
                  </div>
                  {f.validation && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#065f46' }}>
                      <span>Red-to-Green Test Provenance:</span>
                      <span>{f.validation.status.toUpperCase()} ({f.validation.executionProvenance || 'fixture-verified'})</span>
                    </div>
                  )}
                  {f.approval && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#1e40af' }}>
                      <span>Human Approval Recorded:</span>
                      <span>Hash: {f.patch?.diffHash.slice(0, 12)}...</span>
                    </div>
                  )}
                  {f.pullRequest && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#0f172a' }}>
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
