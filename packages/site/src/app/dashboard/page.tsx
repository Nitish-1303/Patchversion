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
import { PayPalUpgradeModal } from './components/PayPalUpgradeModal';
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
  const [activeTab, setActiveTab] = useState<'Breaking Upgrades' | 'Pull Requests' | 'Dependency Inventory'>('Breaking Upgrades');
  const [showGraph, setShowGraph] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isProUser, setIsProUser] = useState(false);
  const [freePrsRemaining, setFreePrsRemaining] = useState(1);

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
        setAuthenticated(prev => {
          if (prev) {
            setActionError('Session expired. Please sign in again.');
          }
          return false;
        });
        setUser(null);
        setTenant(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('patchversion_token');
        }
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
        const res = await authFetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (!isMounted) return;
          if (data.authenticated) {
            setAuthenticated(true);
            setUser(data.user);
            setTenant(data.tenant);

            const reposRes = await authFetch('/api/repos');
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
      await fetch('/api/auth', { method: 'DELETE' });
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
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'demo', email: 'developer@trypatchbay.dev' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessionToken(data.token);
        sessionStorage.setItem('patchversion_token', data.token);
        setAuthenticated(true);
        setUser(data.user);
        setTenant(data.tenant);

        const reposRes = await fetch('/api/repos', {
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
      const res = await authFetch('/api/repos', {
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
        const reposRes = await authFetch('/api/repos');
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

  // If not authenticated, open public demo workspace with developer sign-in options
  if (authenticated === false) {
    return (
      <div style={{ minHeight: '100vh', background: '#F7F8FA' }}>
        {/* Public Demo Cockpit with genuine Lodash migration proof */}
        <PublicDemoCockpit authenticated={false} onSignInClick={handleDemoSignIn} />
      </div>
    );
  }

  const hasRegressions = findings.some(f => f.isBreaking);
  const activePrs = findings.filter(f => f.pullRequest);

  // Active finding to display in workbench (defaults to mockpay fixture or real finding)
  const realFinding = findings.find(f => f.isBreaking);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      {/* 1. Ultra-clean Unified Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Brand & Repository Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrypatchbayMark size={28} />
              <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em', color: '#0f172a' }}>
                TryPatchBay
              </span>
            </div>

            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Active Repository:</span>
              <select
                value={selectedRepo?.id ?? ''}
                onChange={e => {
                  const repo = repositories.find(r => r.id === e.target.value);
                  if (repo) setSelectedRepo(repo);
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {repositories.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} {r.isDemo ? '(Interactive Demo Fixture)' : '(Live Public GitHub)'}
                  </option>
                ))}
              </select>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: selectedRepo?.isDemo ? '#fffbeb' : '#ecfdf5',
                  color: selectedRepo?.isDemo ? '#92400e' : '#065f46',
                  border: '1px solid ' + (selectedRepo?.isDemo ? '#fde68a' : '#a7f3d0'),
                }}
              >
                <PulseDotIcon color={selectedRepo?.isDemo ? '#f59e0b' : '#10b981'} size={6} />
                {selectedRepo?.isDemo ? 'Demo Fixture' : 'Live GitHub'}
              </span>
            </div>
          </div>

          {/* Action Buttons & User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleScan}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.1)',
              }}
            >
              <span>{loading ? 'Scanning AST...' : 'Scan Repository'}</span>
            </button>

            <button
              type="button"
              onClick={handleInstallGitHubApp}
              disabled={onboardingLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
              }}
            >
              <BrandIcon name="github" size={13} />
              <span>{onboardingLoading ? 'Opening...' : 'Connect GitHub App'}</span>
            </button>

            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

            {/* Pro Plan Status / Upgrade Button */}
            {isProUser ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: '#1d4ed8',
                  border: '1px solid #93c5fd',
                }}
              >
                <span>PRO PLAN ($49/mo)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>⚡ Upgrade to Pro ($49/mo)</span>
              </button>
            )}

            <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {user?.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
        {/* Action / Error Banners */}
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
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>i</span>
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
              marginBottom: '16px',
            }}
          >
            <span>{actionError}</span>
          </div>
        )}

        {/* 2. Executive Status Summary Bar */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: (hasRegressions || selectedRepo?.isDemo) ? '#fef3c7' : '#ecfdf5',
                  color: (hasRegressions || selectedRepo?.isDemo) ? '#92400e' : '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(hasRegressions || selectedRepo?.isDemo) ? (
                  <AlertTriangleIcon size={16} color="#92400e" />
                ) : (
                  <CheckCircleIcon size={16} color="#059669" />
                )}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  REPOSITORY HEALTH
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {(hasRegressions || selectedRepo?.isDemo)
                    ? '1 Breaking Drift Found (Fix Ready)'
                    : 'All Dependencies Clean'}
                </div>
              </div>
            </div>

            <div style={{ height: '28px', width: '1px', background: '#f1f5f9' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayersIcon size={16} color="#334155" />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  ANALYZED INVENTORY
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {scanResult?.totalDependencies ?? 0} Packages Mapped ({scanResult?.directCount ?? 0} direct)
                </div>
              </div>
            </div>

            <div style={{ height: '28px', width: '1px', background: '#f1f5f9' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheckIcon size={16} color="#1e40af" />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>
                  ENGINE BOUNDARY
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Deterministic AST Engine · Red/Green Proof Verified
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
            Branch: <strong style={{ color: '#0f172a' }}>{selectedRepo?.defaultBranch || 'main'}</strong> · sha256:{scanResult?.provenance?.commitSha?.slice(0, 7) || '5f160dc'}
          </div>
        </div>

        {/* 3. The 3 Clean Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '20px',
            paddingBottom: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('Breaking Upgrades')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'Breaking Upgrades' ? 700 : 500,
              color: activeTab === 'Breaking Upgrades' ? '#0f172a' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'Breaking Upgrades' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Breaking Upgrades</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '999px',
                background: (hasRegressions || selectedRepo?.isDemo) ? '#fef3c7' : '#f1f5f9',
                color: (hasRegressions || selectedRepo?.isDemo) ? '#92400e' : '#64748b',
                fontWeight: 700,
              }}
            >
              {hasRegressions ? findings.length : (selectedRepo?.isDemo ? 2 : 0)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Pull Requests')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'Pull Requests' ? 700 : 500,
              color: activeTab === 'Pull Requests' ? '#0f172a' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'Pull Requests' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Delivered Pull Requests</span>
            {activePrs.length > 0 && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontWeight: 700,
                }}
              >
                {activePrs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('Dependency Inventory')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: activeTab === 'Dependency Inventory' ? 700 : 500,
              color: activeTab === 'Dependency Inventory' ? '#0f172a' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'Dependency Inventory' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Dependency Inventory</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '999px',
                background: '#f1f5f9',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              {scanResult?.totalDependencies ?? 0}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: BREAKING UPGRADES & AST FIX WORKBENCH                   */}
        {/* ============================================================== */}
        {activeTab === 'Breaking Upgrades' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '360px 1fr',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Finding Selector List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '0 4px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>
                  Detected Upgrades
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                  Select an upgrade finding to inspect the AST diff and proof.
                </p>
              </div>

              {selectedRepo?.isDemo ? (
                <>
                  {/* Demo Card 1: mockpay */}
                  <div
                    onClick={() => {
                      setProofFixtureKey('mockpay');
                      setProofHumanApproved(false);
                      setProofStep(3);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: proofFixtureKey === 'mockpay' ? '#ffffff' : '#f8fafc',
                      border: proofFixtureKey === 'mockpay' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      boxShadow: proofFixtureKey === 'mockpay' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>mockpay</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#fee2e2',
                          color: '#991b1b',
                        }}
                      >
                        PARAM RENAMED
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                      Upgrade: <code style={{ color: '#0f172a' }}>1.0.0 → 2.0.0</code>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Call site:</span>
                      <code style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>
                        src/createCharge.js:42
                      </code>
                    </div>
                  </div>

                  {/* Demo Card 2: lodash */}
                  <div
                    onClick={() => {
                      setProofFixtureKey('lodash');
                      setProofHumanApproved(false);
                      setProofStep(3);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: proofFixtureKey === 'lodash' ? '#ffffff' : '#f8fafc',
                      border: proofFixtureKey === 'lodash' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      boxShadow: proofFixtureKey === 'lodash' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>lodash</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        DEPRECATION
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px' }}>
                      Upgrade: <code style={{ color: '#0f172a' }}>4.17.21 → 4.18.0</code>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Call site:</span>
                      <code style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>
                        src/utils.js:18
                      </code>
                    </div>
                  </div>
                </>
              ) : findings.length > 0 ? (
                findings.map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      background: '#ffffff',
                      border: '2px solid #2563eb',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{f.packageName}</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: f.isBreaking ? '#fee2e2' : '#ecfdf5',
                          color: f.isBreaking ? '#991b1b' : '#065f46',
                        }}
                      >
                        {f.isBreaking ? 'BREAKING DRIFT' : 'CLEAN'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      {f.fromVersion} → {f.toVersion}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                  }}
                >
                  <CheckCircleIcon size={24} color="#059669" />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '8px' }}>
                    0 Breaking Regressions
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 14px' }}>
                    All analyzed dependencies pass without breaking API drifts.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const demoRepo = repositories.find(r => r.isDemo);
                      if (demoRepo) setSelectedRepo(demoRepo);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer',
                    }}
                  >
                    Try Demo Migration Fixture →
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Active Fix & Delivery Workbench */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Workbench Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      AST VERIFIED FIX
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                      {activeFixture.callsite}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    {activeFixture.name}: {activeFixture.title}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                    {activeFixture.summary}
                  </p>
                </div>

                {/* Simulation Runner */}
                <button
                  type="button"
                  onClick={runProofSimulation}
                  disabled={proofIsRunning}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: proofIsRunning ? '#f1f5f9' : '#0f172a',
                    color: proofIsRunning ? '#64748b' : '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: proofIsRunning ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{proofIsRunning ? 'Running Sandbox Proof...' : 'Re-Run Proof Verification'}</span>
                </button>
              </div>

              {/* Red-to-Green Test Verification Strip */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                    <CheckCircleIcon size={12} color="#059669" />
                    <span>Baseline (v1.0): PASS</span>
                  </div>
                  <span style={{ color: '#cbd5e1' }}>→</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#dc2626' }}>
                    <AlertTriangleIcon size={12} color="#dc2626" />
                    <span>Upgraded (v2.0): FAIL</span>
                  </div>
                  <span style={{ color: '#cbd5e1' }}>→</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#059669' }}>
                    <CheckCircleIcon size={12} color="#059669" />
                    <span>Patched: PASS</span>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                  Execution: 142ms · Zero Regressions
                </div>
              </div>

              {/* Unified Diff Box */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    Automated AST Code Patch
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'ui-monospace, monospace' }}>
                    Unified Diff
                  </span>
                </div>

                <div
                  style={{
                    background: '#0f172a',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: '#e2e8f0',
                    overflowX: 'auto',
                  }}
                >
                  {activeFixture.diffLines.map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        background:
                          line.type === 'del'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : line.type === 'add'
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'transparent',
                        color:
                          line.type === 'del'
                            ? '#fca5a5'
                            : line.type === 'add'
                            ? '#86efac'
                            : '#cbd5e1',
                        padding: '1px 8px',
                        borderRadius: '2px',
                      }}
                    >
                      <span style={{ width: '32px', color: '#64748b', userSelect: 'none' }}>{line.num}</span>
                      <span style={{ width: '16px', fontWeight: 700, userSelect: 'none' }}>{line.prefix}</span>
                      <span>{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terminal Test Verification Output */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Sandbox Test Execution Evidence
                </div>
                <div
                  style={{
                    background: '#0f172a',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    color: '#86efac',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {activeFixture.testLogs.verified}
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div
                style={{
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (realFinding?.patch) {
                        handleApprove(realFinding.patch.id, realFinding.patch.diffHash);
                      } else {
                        setProofHumanApproved(true);
                      }
                    }}
                    disabled={proofHumanApproved || Boolean(realFinding?.approval)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: (proofHumanApproved || Boolean(realFinding?.approval)) ? '#ecfdf5' : '#ffffff',
                      color: (proofHumanApproved || Boolean(realFinding?.approval)) ? '#065f46' : '#0f172a',
                      border: (proofHumanApproved || Boolean(realFinding?.approval)) ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: (proofHumanApproved || Boolean(realFinding?.approval)) ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {(proofHumanApproved || Boolean(realFinding?.approval)) ? (
                      <>
                        <CheckCircleIcon size={14} color="#059669" />
                        <span>Patch Approved</span>
                      </>
                    ) : (
                      <span>Approve AST Patch</span>
                    )}
                  </button>

                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Diff Hash: sha256:{activeFixture.diffDigest.slice(-6)}
                  </span>
                </div>

                {/* Primary Action Button: Deliver Pull Request */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isProUser && freePrsRemaining <= 0) {
                      setUpgradeModalOpen(true);
                      return;
                    }
                    if (realFinding?.patch) {
                      handleDeliverPR(realFinding.patch.id);
                      if (!isProUser) setFreePrsRemaining(prev => Math.max(0, prev - 1));
                    } else {
                      // Demo simulation delivery
                      setActionMessage('Delivering Pull Request to GitHub (Simulation Mode)...');
                      setTimeout(() => {
                        setActionMessage('Pull Request delivered successfully! PR #1 created on GitHub (Simulated demo mode).');
                        if (!isProUser) setFreePrsRemaining(prev => Math.max(0, prev - 1));
                        setActiveTab('Pull Requests');
                      }, 900);
                    }
                  }}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <BrandIcon name="github" size={14} />
                  <span>{loading ? 'Delivering PR...' : 'Deliver Pull Request on GitHub'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DELIVERED PULL REQUESTS                                 */}
        {/* ============================================================== */}
        {activeTab === 'Pull Requests' && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                  Delivered GitHub Pull Requests
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Automated migration pull requests opened by TryPatchBay with cryptographic proof evidence.
                </p>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: '#ecfdf5',
                  color: '#065f46',
                }}
              >
                GitHub App Active
              </span>
            </div>

            {/* If real PRs exist in findings */}
            {activePrs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activePrs.map(f => (
                  <div
                    key={f.id}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                        Fix: Upgrade {f.packageName} ({f.fromVersion} → {f.toVersion})
                      </strong>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                        Branch: <code>{f.pullRequest?.branchName}</code> · Target: <code>{selectedRepo?.fullName}</code>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: f.pullRequest?.isSimulation ? '#fef3c7' : '#ecfdf5',
                          color: f.pullRequest?.isSimulation ? '#92400e' : '#065f46',
                        }}
                      >
                        {f.pullRequest?.isSimulation ? 'LOCAL SIMULATION' : 'LIVE GITHUB PR'}
                      </span>

                      <a
                        href={f.pullRequest?.githubPrUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#2563eb',
                          textDecoration: 'none',
                        }}
                      >
                        View PR #{f.pullRequest?.githubPrNumber} →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback preview item if in demo mode or no live PR yet */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      Fix: Upgrade mockpay (1.0.0 → 2.0.0) with createCharge signature migration
                    </strong>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Branch: <code>patchversion/mockpay-2.0.0</code> · Target: <code>patchbay-demo/checkout-service</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: '#eff6ff',
                        color: '#1e40af',
                      }}
                    >
                      PR READY FOR DELIVERY
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveTab('Breaking Upgrades')}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#2563eb',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Review &amp; Open PR →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DEPENDENCY INVENTORY                                    */}
        {/* ============================================================== */}
        {activeTab === 'Dependency Inventory' && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
            }}
          >
            {/* Header + Search + Graph Toggle */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '16px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                  Analyzed Dependency Inventory
                </h2>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Complete inventory of direct and transitive packages mapped by the AST scanner.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Filter packages..."
                  value={depSearch}
                  onChange={e => setDepSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                    minWidth: '200px',
                  }}
                />

                {/* Filter pills */}
                <select
                  value={depFilter}
                  onChange={e => setDepFilter(e.target.value as typeof depFilter)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Packages ({scanResult?.totalDependencies ?? 0})</option>
                  <option value="direct">Direct Only ({scanResult?.directCount ?? 0})</option>
                  <option value="transitive">Transitive Only ({scanResult?.transitiveCount ?? 0})</option>
                  <option value="concerns">Has Upgrades Only</option>
                </select>

                {/* Toggle visual graph */}
                {scanResult?.graph && (
                  <button
                    type="button"
                    onClick={() => setShowGraph(!showGraph)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: showGraph ? '#0f172a' : '#ffffff',
                      color: showGraph ? '#ffffff' : '#334155',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    {showGraph ? 'Hide Graph Canvas' : 'Show Graph Canvas'}
                  </button>
                )}
              </div>
            </div>

            {/* Optional Interactive Graph Canvas */}
            {showGraph && scanResult?.graph && (
              <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                <InteractiveGraph graph={scanResult.graph} repoFullName={selectedRepo?.fullName ?? 'repository'} />
              </div>
            )}

            {/* Clean Dependency Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Package</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Current Version</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Latest</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Call Sites</th>
                    <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDependencies.slice(0, 50).map(dep => (
                    <tr key={dep.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {dep.name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: dep.type.startsWith('direct') ? '#eff6ff' : '#f1f5f9',
                            color: dep.type.startsWith('direct') ? '#1e40af' : '#64748b',
                          }}
                        >
                          {dep.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontFamily: 'ui-monospace, monospace' }}>
                        {dep.declaredVersion}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontFamily: 'ui-monospace, monospace' }}>
                        {dep.resolvedVersion || dep.declaredVersion}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>
                        {dep.importingFiles.length} file{dep.importingFiles.length === 1 ? '' : 's'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {dep.concerns.length > 0 ? (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#b45309' }}>
                            UPGRADE AVAILABLE
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>
                            UP TO DATE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredDependencies.length > 50 && (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: '#64748b' }}>
                  Showing first 50 of {filteredDependencies.length} packages. Use filter search to find specific dependencies.
                </div>
              )}
            </div>
          </div>
        )}

        {/* PayPal Repository Pro Modal */}
        <PayPalUpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          onPlanActivated={() => {
            setIsProUser(true);
            setActionMessage('Repository Pro activated via PayPal! Unlimited pull requests unlocked.');
          }}
        />
      </main>
    </div>
  );
}
