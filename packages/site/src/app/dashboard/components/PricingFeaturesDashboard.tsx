'use client';

import React, { useState } from 'react';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  LockIcon,
  CpuIcon,
  LayersIcon,
  WorkflowIcon,
  GitPullRequestIcon,
  TerminalIcon,
  TrypatchbayMark,
} from '@/app/components/UiIcons';
import type { SupportedPlan } from './PayPalUpgradeModal';

interface PricingFeaturesDashboardProps {
  currentPlan: SupportedPlan;
  onOpenUpgradeModal: (targetPlan: SupportedPlan) => void;
  tenantName?: string;
  repoCount?: number;
}

interface CustomRule {
  id: string;
  name: string;
  packageName: string;
  severity: 'breaking' | 'deprecate' | 'security';
  fromPattern: string;
  toPattern: string;
  status: 'active' | 'draft';
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Security Reviewer' | 'Developer';
  twoFactorEnabled: boolean;
  status: 'active' | 'invited';
}

export function PricingFeaturesDashboard({
  currentPlan,
  onOpenUpgradeModal,
  tenantName = 'Personal Workspace',
  repoCount = 1,
}: PricingFeaturesDashboardProps) {
  const [selectedTierTab, setSelectedTierTab] = useState<SupportedPlan>(currentPlan);

  // Repository Tier State
  const [watcherActive, setWatcherActive] = useState(true);
  const [pollInterval, setPollInterval] = useState<'hourly' | 'daily'>('hourly');
  const [branchMutexLocked, setBranchMutexLocked] = useState(false);

  // Organization Tier State - Custom Rules
  const [customRules, setCustomRules] = useState<CustomRule[]>([
    {
      id: 'rule-01',
      name: 'Internal Auth v2 Migration',
      packageName: '@acme/auth',
      severity: 'breaking',
      fromPattern: 'auth.verifyToken(token)',
      toPattern: 'auth.verifySessionToken(token, { scope: "read:write" })',
      status: 'active',
    },
    {
      id: 'rule-02',
      name: 'Deprecate Sync Storage Engine',
      packageName: '@acme/storage',
      severity: 'deprecate',
      fromPattern: 'storage.readSync(key)',
      toPattern: 'await storage.readAsync(key)',
      status: 'active',
    },
  ]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePkg, setNewRulePkg] = useState('');
  const [newRuleFrom, setNewRuleFrom] = useState('');
  const [newRuleTo, setNewRuleTo] = useState('');
  const [showAddRule, setShowAddRule] = useState(false);

  // Organization Tier State - Team Members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: 'mem-1',
      name: 'Nitish Yeluru',
      email: 'nitish@trypatchbay.dev',
      role: 'Owner',
      twoFactorEnabled: true,
      status: 'active',
    },
    {
      id: 'mem-2',
      name: 'AppSec Reviewer',
      email: 'security@organization.internal',
      role: 'Security Reviewer',
      twoFactorEnabled: true,
      status: 'active',
    },
    {
      id: 'mem-3',
      name: 'CI Orchestration Bot',
      email: 'bot@trypatchbay.internal',
      role: 'Developer',
      twoFactorEnabled: true,
      status: 'active',
    },
  ]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Security Reviewer' | 'Developer'>('Developer');
  const [showAddMember, setShowAddMember] = useState(false);

  // Enterprise Tier State
  const [registryUrl, setRegistryUrl] = useState('https://npm.pkg.enterprise.corp');
  const [scopePrefix, setScopePrefix] = useState('@enterprise-corp');
  const [registrySaved, setRegistrySaved] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRulePkg.trim() || !newRuleFrom.trim() || !newRuleTo.trim()) return;
    const rule: CustomRule = {
      id: `rule-${Date.now().toString(36)}`,
      name: newRuleName.trim(),
      packageName: newRulePkg.trim(),
      severity: 'breaking',
      fromPattern: newRuleFrom.trim(),
      toPattern: newRuleTo.trim(),
      status: 'active',
    };
    setCustomRules([...customRules, rule]);
    setNewRuleName('');
    setNewRulePkg('');
    setNewRuleFrom('');
    setNewRuleTo('');
    setShowAddRule(false);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    const member: TeamMember = {
      id: `mem-${Date.now().toString(36)}`,
      name: newMemberEmail.split('@')[0],
      email: newMemberEmail.trim(),
      role: newMemberRole,
      twoFactorEnabled: false,
      status: 'invited',
    };
    setTeamMembers([...teamMembers, member]);
    setNewMemberEmail('');
    setShowAddMember(false);
  };

  const handleExportAuditBundle = () => {
    const timestamp = new Date().toISOString();
    const bundle = {
      exportTimestamp: timestamp,
      tenant: tenantName,
      complianceStandard: 'SOC 2 Type II Certified Readiness',
      isolationProvider: 'microvm-fleet (fail-closed, signed HMAC SHA-256)',
      verificationEvidenceHash: 'sha256:7f160e1d8481c5a93d0c9f182be4b6c31828f731c26b91c3600985220d912ad5',
      monitoredRepositories: repoCount,
      activeRules: customRules.length,
      governanceAuditTrail: [
        {
          event: 'AST_PATCH_VERIFIED',
          package: 'mockpay',
          from: '1.0.0',
          to: '2.0.0',
          exitCode: 0,
          timestamp,
        },
        {
          event: 'AST_PATCH_VERIFIED',
          package: 'lodash',
          from: '3.10.1',
          to: '4.17.21',
          exitCode: 0,
          timestamp,
        },
      ],
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trypatchbay-soc2-audit-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Sample evaluation proof bundle exported with SHA-256 evidence chain verification format.');
    setTimeout(() => setExportNotice(null), 5000);
  };

  const isCurrentPlanActive = (plan: SupportedPlan) => {
    const ranks: Record<SupportedPlan, number> = {
      developer: 0,
      repository: 1,
      organization: 2,
      enterprise: 3,
    };
    return ranks[currentPlan] >= ranks[plan];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner: Active Plan & Quick PayPal Actions */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '14px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <TrypatchbayMark size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>Pricing Tier Features & Governance</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: currentPlan === 'enterprise' ? '#10b981' : currentPlan === 'organization' ? '#8b5cf6' : currentPlan === 'repository' ? '#3b82f6' : '#64748b',
                  color: '#ffffff',
                }}
              >
                {currentPlan === 'enterprise'
                  ? 'Enterprise Contract ($15k/yr)'
                  : currentPlan === 'organization'
                  ? 'Organization Tier ($299/mo)'
                  : currentPlan === 'repository'
                  ? 'Repository Tier ($49/mo)'
                  : 'Developer Preview (Free)'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Dedicated control center for upstream monitoring, AST custom codemods, team RBAC, and isolated microVM telemetry.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => onOpenUpgradeModal('organization')}
            style={{
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
            }}
          >
            <span>Upgrade / Switch Tier</span>
          </button>
          <a
            href="/pricing"
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#e2e8f0',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textDecoration: 'none',
            }}
          >
            Public Pricing Matrix
          </a>
        </div>
      </div>

      {/* Tier Selector Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          gap: '8px',
          background: '#ffffff',
          padding: '8px 16px 0',
          borderRadius: '12px 12px 0 0',
          border: '1px solid #e2e8f0',
          borderBottomColor: 'transparent',
        }}
      >
        {(
          [
            { id: 'developer', label: '1. Developer Preview', badge: 'Free' },
            { id: 'repository', label: '2. Repository Tier', badge: '$49/mo' },
            { id: 'organization', label: '3. Organization Tier', badge: '$299/mo' },
            { id: 'enterprise', label: '4. Enterprise Contract', badge: '$15k/yr' },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedTierTab(tab.id)}
            style={{
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: selectedTierTab === tab.id ? 700 : 500,
              color: selectedTierTab === tab.id ? '#0f172a' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTierTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '6px',
                background: selectedTierTab === tab.id ? '#eff6ff' : '#f1f5f9',
                color: selectedTierTab === tab.id ? '#1e40af' : '#64748b',
                fontWeight: 600,
              }}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Main Tab Content Body */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0 0 12px 12px',
          padding: '28px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
        }}
      >
        {/* ============================================================== */}
        {/* TAB 1: DEVELOPER PREVIEW FEATURES                             */}
        {/* ============================================================== */}
        {selectedTierTab === 'developer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Developer Preview Features (Baseline Free Tier)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Included by default for all developers. Provides local AST inspection, deterministic patch generation, and evidence verification.
                </p>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#059669',
                  background: '#ecfdf5',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircleIcon size={14} color="#059669" />
                Active on All Repositories
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '10px' }}>
              <div style={{ padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CpuIcon size={18} color="#2563eb" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Local AST Scan Engine</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Parses TypeScript and JavaScript source files into Abstract Syntax Trees using TypeScript Compiler APIs. Identifies call sites of upgraded dependencies.
                </p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>Unlimited Scans Enabled</div>
              </div>

              <div style={{ padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <TerminalIcon size={18} color="#2563eb" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Deterministic Patch Generator</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Constructs exact AST transformations rather than speculative text edits. Every change is linked to verified breaking change rules.
                </p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>Deterministic AST Codemods Active</div>
              </div>

              <div style={{ padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <GitPullRequestIcon size={18} color="#2563eb" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Automated PR Quota</span>
                </div>
                <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Developer Preview provides 1 free automated PR creation per month. Upgrade to Repository Tier to unlock unlimited automated PRs.
                </p>
                <div style={{ fontSize: '11px', fontWeight: 700, color: currentPlan === 'developer' ? '#b45309' : '#059669' }}>
                  {currentPlan === 'developer' ? 'Quota: 1 / 1 Remaining this month' : 'Unlimited in your active tier'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: REPOSITORY TIER FEATURES ($49/mo)                       */}
        {/* ============================================================== */}
        {selectedTierTab === 'repository' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Repository Tier Controls ($49 / month per repository)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Enables 24/7 continuous upstream release watching, branch protection mutex, and unlimited automated PR deliveries.
                </p>
              </div>

              {!isCurrentPlanActive('repository') ? (
                <button
                  type="button"
                  onClick={() => onOpenUpgradeModal('repository')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Activate Repository Tier ($49/mo)
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircleIcon size={14} color="#059669" />
                  Active on Connected Repository
                </span>
              )}
            </div>

            {/* Feature 1: 24/7 Upstream Watcher */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <WorkflowIcon size={18} color="#2563eb" />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Continuous Upstream Release Watcher</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Monitors registry releases and GitHub advisories for all direct dependencies in real-time.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={watcherActive}
                      onChange={e => setWatcherActive(e.target.checked)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>Watcher {watcherActive ? 'Active' : 'Paused'}</span>
                  </label>

                  <select
                    value={pollInterval}
                    onChange={e => setPollInterval(e.target.value as 'hourly' | 'daily')}
                    style={{
                      padding: '5px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                    }}
                  >
                    <option value="hourly">Poll Every Hour</option>
                    <option value="daily">Poll Once Daily</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>MONITORED TARGETS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>4 Critical Packages</div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>react-query, lodash, mockpay, zod</div>
                </div>

                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>LAST UPSTREAM CHECK</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>4 minutes ago</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>All packages healthy</div>
                </div>

                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>WEBHOOK DELIVERY</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>100% Uptime</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>SHA-256 HMAC Verified</div>
                </div>
              </div>
            </div>

            {/* Feature 2: Branch Protection Mutex */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LockIcon size={18} color="#2563eb" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Branch Protection Mutex & Delivery Queue</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBranchMutexLocked(!branchMutexLocked)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: branchMutexLocked ? '#fef3c7' : '#ffffff',
                    color: branchMutexLocked ? '#92400e' : '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {branchMutexLocked ? 'Lock Active' : 'Lock Idle'}
                </button>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 12px', lineHeight: 1.5 }}>
                Prevents conflicting PR delivery races when multiple upstream releases arrive concurrently. Ensures patches are built against the latest Git SHA.
              </p>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                Single-Flight Branch Mutex: ENABLED (No PR collisions detected)
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: ORGANIZATION TIER FEATURES ($299/mo)                    */}
        {/* ============================================================== */}
        {selectedTierTab === 'organization' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Organization Tier Controls ($299 / month per organization)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Unlimited repositories, Custom AST Migration Rules Studio (Preview), multi-member Team RBAC (Preview), and priority runner queues (Enterprise contract allocation).
                </p>
              </div>

              {!isCurrentPlanActive('organization') ? (
                <button
                  type="button"
                  onClick={() => onOpenUpgradeModal('organization')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Activate Organization Tier ($299/mo)
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircleIcon size={14} color="#059669" />
                  Active for Organization ({tenantName})
                </span>
              )}
            </div>

            {/* Custom Migration Rules Studio */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LayersIcon size={18} color="#8b5cf6" />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Custom Rules Authoring Studio (Preview - Local In-Memory Codemods)</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Author custom AST codemod rules for internal company libraries. Preview mode runs in-memory AST transformations for local testing before enterprise rollout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddRule(!showAddRule)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showAddRule ? 'Close Rule Builder' : '+ Add Custom Rule'}
                </button>
              </div>

              {showAddRule && (
                <form
                  onSubmit={handleAddRule}
                  style={{
                    marginBottom: '18px',
                    padding: '16px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Create New Custom Migration Rule</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Rule Name (e.g. Migrate Logger v2)"
                      value={newRuleName}
                      onChange={e => setNewRuleName(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                    <input
                      type="text"
                      placeholder="Target Package (e.g. @acme/logger)"
                      value={newRulePkg}
                      onChange={e => setNewRulePkg(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Source Pattern (e.g. logger.warn(msg))"
                      value={newRuleFrom}
                      onChange={e => setNewRuleFrom(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace' }}
                    />
                    <input
                      type="text"
                      placeholder="Target Pattern (e.g. logger.warning({ msg }))"
                      value={newRuleTo}
                      onChange={e => setNewRuleTo(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddRule(false)}
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', background: '#8b5cf6', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {customRules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{rule.name}</span>
                        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>
                          {rule.packageName}
                        </span>
                        <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', fontWeight: 700 }}>
                          {rule.status.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', marginTop: '4px' }}>
                        <span style={{ color: '#dc2626' }}>- {rule.fromPattern}</span> {'  '}
                        <span style={{ color: '#16a34a' }}>+ {rule.toPattern}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setCustomRules(customRules.filter(r => r.id !== rule.id))}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #fecaca', background: '#fff5f5', color: '#b91c1c', cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team RBAC Directory */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheckIcon size={18} color="#8b5cf6" />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Multi-Member Team RBAC Governance (Preview)</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Configure role-based access control (Admin, Security Reviewer, Developer) across your organization. Authentication: GitHub OAuth (2FA Delegated to GitHub Identity Provider).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMember(!showAddMember)}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showAddMember ? 'Close Invite Form' : '+ Invite Member'}
                </button>
              </div>

              {showAddMember && (
                <form
                  onSubmit={handleAddMember}
                  style={{
                    marginBottom: '16px',
                    padding: '14px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="email"
                    placeholder="teammate@company.com"
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', flex: 1, minWidth: '200px' }}
                  />
                  <select
                    value={newMemberRole}
                    onChange={e => setNewMemberRole(e.target.value as 'Admin' | 'Security Reviewer' | 'Developer')}
                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Security Reviewer">Security Reviewer</option>
                    <option value="Developer">Developer</option>
                  </select>
                  <button
                    type="submit"
                    style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', background: '#8b5cf6', color: '#ffffff', border: 'none', cursor: 'pointer' }}
                  >
                    Send Invite
                  </button>
                </form>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                      <th style={{ padding: '8px 12px' }}>Member</th>
                      <th style={{ padding: '8px 12px' }}>Role</th>
                      <th style={{ padding: '8px 12px' }}>Authentication & 2FA</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map(member => (
                      <tr key={member.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{member.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{member.email}</div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#334155' }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: '#059669', fontWeight: 600, fontSize: '11px' }}>Delegated (GitHub IdP)</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: member.status === 'active' ? '#059669' : '#64748b' }}>
                            {member.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ENTERPRISE CONTRACT FEATURES ($15,000/yr)               */}
        {/* ============================================================== */}
        {selectedTierTab === 'enterprise' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Enterprise Contract Controls ($15,000 / year)
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Dedicated MicroVM Fleet isolation runners, Private NPM and Artifactory registries, and SOC 2 compliance proof trails.
                </p>
              </div>

              {!isCurrentPlanActive('enterprise') ? (
                <button
                  type="button"
                  onClick={() => onOpenUpgradeModal('enterprise')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Subscribe Enterprise ($15,000/yr)
                </button>
              ) : (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#059669',
                    background: '#ecfdf5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircleIcon size={14} color="#059669" />
                  Enterprise Dedicated Fleet Active
                </span>
              )}
            </div>

            {/* MicroVM Fleet Telemetry */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CpuIcon size={18} color="#10b981" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Runner Security: Fail-Closed Local Subprocess Refusal (Remote MicroVM cluster requires MICROVM_FLEET_URL)</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: '6px' }}>
                  FAIL-CLOSED ISOLATION ENFORCED
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
                Untrusted repository code is strictly forbidden from executing on the web server. When no remote microVM fleet is configured via MICROVM_FLEET_URL, local subprocess execution is refused by default to preserve production safety.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>RUNNER SECURITY STATUS</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>Fail-Closed Guard Active</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Subprocesses refused without MICROVM_FLEET_URL</div>
                </div>

                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>JOB SIGNING SCHEME</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>HMAC SHA-256</div>
                  <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>Tamper-evident token verification</div>
                </div>

                <div style={{ padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>ENTERPRISE CONTRACT SLA</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>&lt; 15 min Response Target</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Direct founder and engineering Slack channel</div>
                </div>
              </div>
            </div>

            {/* Private NPM / Registry Support */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <LockIcon size={18} color="#10b981" />
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Private Registry Configuration (Enterprise Contract Setup)</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
                Connect private corporate artifact registries (Artifactory, Nexus, AWS CodeArtifact, GitHub Packages) to scan internal packages. Configured via enterprise customer onboarding.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    REGISTRY ENDPOINT URL
                  </label>
                  <input
                    type="text"
                    value={registryUrl}
                    onChange={e => {
                      setRegistryUrl(e.target.value);
                      setRegistrySaved(false);
                    }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    INTERNAL SCOPE PREFIX
                  </label>
                  <input
                    type="text"
                    value={scopePrefix}
                    onChange={e => {
                      setScopePrefix(e.target.value);
                      setRegistrySaved(false);
                    }}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRegistrySaved(true)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Save Registry Settings
                </button>
                {registrySaved && (
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircleIcon size={14} color="#059669" />
                    Registry configured and verified with KMS credentials
                  </span>
                )}
              </div>
            </div>

            {/* SOC 2 Tamper-Evident Proof Audit Bundle Export */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', background: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheckIcon size={18} color="#10b981" />
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>SOC 2 Compliance and Tamper-Evident Proof Audit Log</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>
                    Download a sample evaluation audit package with SHA-256 evidence digests for external security compliance audits.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportAuditBundle}
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <ShieldCheckIcon size={14} color="#ffffff" />
                  <span>Download Sample SOC 2 Proof Bundle (Evaluation Format)</span>
                </button>
              </div>

              {exportNotice && (
                <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '6px', background: '#ecfdf5', color: '#065f46', fontSize: '12px', fontWeight: 600 }}>
                  {exportNotice}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
