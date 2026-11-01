'use client';

import React from 'react';
import type { RepositoryScanResult } from '@patchversion/shared';
import type { FindingInfo } from './TriageCard';
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  GitCommitIcon,
  GitBranchIcon,
  LockIcon,
} from '@/app/components/UiIcons';

interface AuditScorecardProps {
  scanResult: RepositoryScanResult | null;
  repoFullName: string;
  isDemo?: boolean;
  findings: FindingInfo[];
}

export function AuditScorecard({
  scanResult,
  repoFullName,
  isDemo,
  findings,
}: AuditScorecardProps) {
  if (!scanResult) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #dfe1ef',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
        }}
      >
        <p>No scan result recorded yet. Run a scan to generate the 8-step verification audit.</p>
      </div>
    );
  }

  const primaryFinding = findings[0];

  const steps = [
    {
      num: 1,
      title: 'REPOSITORY ANALYZED',
      value: repoFullName,
      subtext: isDemo
        ? 'Deterministic Migration & Approval Demo Fixture'
        : 'Live Public GitHub Repository (Read-Only AST Scan)',
      status: 'VERIFIED',
      icon: <GitBranchIcon size={12} color="#166534" />,
      statusColor: '#166534',
      statusBg: '#dcfce7',
    },
    {
      num: 2,
      title: 'DEPENDENCIES DETECTED',
      value: `${scanResult.totalDependencies} total dependencies`,
      subtext: `${scanResult.directCount} direct · ${scanResult.transitiveCount} transitive · ${scanResult.packageManager} lockfile`,
      status: 'MAPPED',
      icon: <CheckCircleIcon size={12} color="#166534" />,
      statusColor: '#166534',
      statusBg: '#dcfce7',
    },
    {
      num: 3,
      title: 'BREAKING REGRESSIONS',
      value: findings.length > 0 ? `${findings.length} regression(s) found` : '0 breaking changes (clean)',
      subtext:
        findings.length > 0
          ? `${findings[0].packageName} ${findings[0].fromVersion} → ${findings[0].toVersion}`
          : 'No breaking changes matched the migration rules currently supported by TryPatchBay.',
      status: findings.length > 0 ? 'ATTENTION' : 'CLEAN',
      icon: findings.length > 0 ? <AlertTriangleIcon size={12} color="#92400e" /> : <CheckCircleIcon size={12} color="#166534" />,
      statusColor: findings.length > 0 ? '#92400e' : '#166534',
      statusBg: findings.length > 0 ? '#fef3c7' : '#dcfce7',
    },
    {
      num: 4,
      title: 'SOURCE LOCATIONS MAPPED',
      value: `${findings[0]?.impactAnalysis?.affectedCallSites?.length ?? 0} affected call site(s)`,
      subtext: `${scanResult.provenance?.filesInspected ?? 0} source file(s) inspected · AST status: ${scanResult.provenance?.astAnalysisStatus?.toUpperCase() ?? 'PARTIAL'}`,
      status: 'COMPLETE',
      icon: <CheckCircleIcon size={12} color="#166534" />,
      statusColor: '#166534',
      statusBg: '#dcfce7',
    },
    {
      num: 5,
      title: 'DETERMINISTIC PATCH',
      value: findings[0]?.patch ? 'Unified diff generated' : 'No patch required',
      subtext: findings[0]?.patch?.diffHash
        ? `SHA-256: ${findings[0].patch.diffHash.slice(0, 16)}...`
        : 'Deterministic AST codemod',
      status: findings[0]?.patch ? 'GENERATED' : 'N/A',
      icon: <LockIcon size={12} color={findings[0]?.patch ? '#3730a3' : '#475569'} />,
      statusColor: findings[0]?.patch ? '#3730a3' : '#475569',
      statusBg: findings[0]?.patch ? '#e0e7ff' : '#f1f5f9',
    },
    {
      num: 6,
      title: 'VALIDATION PROVENANCE',
      value:
        primaryFinding?.validation?.executionProvenance?.toUpperCase() ??
        (findings.length === 0 ? 'NOT-EXECUTED (ZERO REGRESSIONS)' : 'NOT-EXECUTED'),
      subtext:
        primaryFinding?.validation?.executionProvenance === 'fixture-verified'
          ? 'Loaded from deterministic fixture proof'
          : primaryFinding?.validation?.executionProvenance === 'executed'
          ? 'Live sandbox test suite execution'
          : 'Untrusted execution disabled on host',
      status: primaryFinding?.validation?.executionProvenance === 'executed' ? 'EXECUTED' : 'SAFE',
      icon: <ShieldCheckIcon size={12} color={primaryFinding?.validation?.executionProvenance === 'executed' ? '#166534' : '#475569'} />,
      statusColor: primaryFinding?.validation?.executionProvenance === 'executed' ? '#166534' : '#475569',
      statusBg: primaryFinding?.validation?.executionProvenance === 'executed' ? '#dcfce7' : '#f1f5f9',
    },
    {
      num: 7,
      title: 'HUMAN APPROVAL STATUS',
      value:
        primaryFinding?.approval?.status === 'active'
          ? 'APPROVED & RECORDED'
          : primaryFinding?.patch
          ? 'PENDING HUMAN REVIEW'
          : 'N/A',
      subtext: primaryFinding?.approval?.diffHashAtApproval
        ? `Diff hash verified: ${primaryFinding.approval.diffHashAtApproval.slice(0, 12)}...`
        : 'Requires exact cryptographic diff hash match',
      status: primaryFinding?.approval?.status === 'active' ? 'APPROVED' : 'GATED',
      icon: <LockIcon size={12} color={primaryFinding?.approval?.status === 'active' ? '#166534' : '#92400e'} />,
      statusColor: primaryFinding?.approval?.status === 'active' ? '#166534' : '#92400e',
      statusBg: primaryFinding?.approval?.status === 'active' ? '#dcfce7' : '#fef3c7',
    },
    {
      num: 8,
      title: 'EXECUTION BOUNDARY & LIMITATIONS',
      value: isDemo ? 'Live PR Delivery Gated' : 'Container Sandbox Required',
      subtext: isDemo
        ? 'Test execution disabled on production host; PR prepared locally'
        : 'Customer test suites fail closed until isolated container runner is active',
      status: 'ENFORCED',
      icon: <ShieldCheckIcon size={12} color="#141a39" />,
      statusColor: '#141a39',
      statusBg: '#e4e5f4',
    },
  ];

  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #dfe1ef',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 10px rgba(20, 26, 57, 0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#efeff9',
              border: '1px solid #dfe1ef',
              color: '#3730a3',
            }}
          >
            <ShieldCheckIcon size={20} />
          </span>
          <div>
            <span className="small-label" style={{ color: '#3730a3' }}>
              DEMONSTRATION AUDIT &amp; EXECUTION SUMMARY
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#141a39', marginTop: '2px', margin: 0 }}>
              Step 9 Verification Audit · {repoFullName}
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '4px 10px',
              borderRadius: '999px',
              background: '#efeff9',
              color: '#252b50',
              border: '1px solid #dfe1ef',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <GitCommitIcon size={12} color="#475569" />
            Commit: {scanResult.provenance?.commitSha ? scanResult.provenance.commitSha.slice(0, 7) : 'HEAD'}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px',
        }}
      >
        {steps.map(step => (
          <div
            key={step.num}
            style={{
              padding: '14px',
              background: '#f7f7fc',
              borderRadius: '8px',
              border: '1px solid #dfe1ef',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  {step.num}. {step.title}
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: step.statusBg,
                    color: step.statusColor,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {step.icon}
                  {step.status}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '6px', color: '#141a39' }}>
                {step.value}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#4e5471', marginTop: '8px', lineHeight: 1.4 }}>
              {step.subtext}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
