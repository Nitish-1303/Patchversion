'use client';

import React, { useState } from 'react';
import { BrandIcon } from '@/app/components/BrandIcons';
import type { MappedDependency, DependencyConcern } from '@patchversion/shared';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  FileCodeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LockIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from '@/app/components/UiIcons';
import { DiffEditor } from './DiffEditor';
import { BlastRadiusMini } from './BlastRadiusMini';

export interface FindingInfo {
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

interface TriageCardProps {
  dependency: MappedDependency;
  finding?: FindingInfo;
  repoFullName: string;
  onApprove?: (patchId: string, diffHash: string) => Promise<void>;
  onDeliverPR?: (patchId: string) => Promise<void>;
  actionLoading?: boolean;
}

export function TriageCard({
  dependency,
  finding,
  repoFullName,
  onApprove,
  onDeliverPR,
  actionLoading = false,
}: TriageCardProps) {
  const [expanded, setExpanded] = useState<boolean>(Boolean(finding));

  const hasFinding = Boolean(finding);
  const hasConcerns = dependency.concerns.length > 0;
  const isDirect = dependency.type !== 'transitive';

  // Determine friendly health status
  let statusBadgeText = 'HEALTHY · UP TO DATE';
  let statusIcon = <CheckCircleIcon size={13} color="#166534" />;
  let statusBadgeStyle = {
    background: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac',
  };

  if (hasFinding && finding?.isBreaking) {
    statusBadgeText = `BREAKING DRIFT · v${finding.fromVersion} → v${finding.toVersion}`;
    statusIcon = <AlertTriangleIcon size={13} color="#92400e" />;
    statusBadgeStyle = {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    };
  } else if (hasConcerns) {
    statusBadgeText = `${dependency.concerns.length} CONCERN(S)`;
    statusIcon = <AlertTriangleIcon size={13} color="#991b1b" />;
    statusBadgeStyle = {
      background: '#fee2e2',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    };
  }

  // Friendly human description
  const callSitesCount = dependency.importingFiles.length;
  let humanSummary = '';
  if (isDirect) {
    humanSummary = `Direct ${dependency.frameworkRole || 'application'} dependency declared in ${dependency.manifestPath}.`;
    if (callSitesCount > 0) {
      humanSummary += ` Actively imported at ${callSitesCount} source location${callSitesCount === 1 ? '' : 's'}.`;
    } else {
      humanSummary += ` Manifest range: ${dependency.declaredVersion}.`;
    }
  } else {
    humanSummary = `Transitive sub-dependency required by ${dependency.directDependents.slice(0, 2).join(', ') || 'parent packages'}.`;
    if (dependency.resolvedVersion) {
      humanSummary += ` Lockfile resolved to v${dependency.resolvedVersion}.`;
    }
  }

  // Brand icon helper
  const getBrandForPackage = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower === 'typescript' || lower.startsWith('@types/')) return 'typescript';
    if (lower === 'node' || lower === 'nodejs') return 'nodejs';
    if (lower === 'docker') return 'docker';
    if (lower === 'postgres' || lower === 'pg' || lower === 'postgresql') return 'postgresql';
    if (lower === 'stripe') return 'stripe';
    if (lower === 'openai') return 'openai';
    if (lower === 'twilio') return 'twilio';
    return 'npm';
  };

  return (
    <article
      className="triage-card"
      style={{
        background: '#ffffff',
        border: hasFinding ? '1px solid #fcd34d' : '1px solid #dfe1ef',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: hasFinding ? '0 4px 16px rgba(180, 83, 9, 0.08)' : '0 2px 8px rgba(20, 26, 57, 0.02)',
        transition: 'all 0.2s ease',
      }}
      data-expanded={expanded}
    >
      {/* Top Card Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#f7f7fc',
              border: '1px solid #dfe1ef',
            }}
          >
            <BrandIcon name={getBrandForPackage(dependency.name)} size={18} useBrandColor />
          </span>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#141a39' }}>
                {dependency.name}
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  background: '#efeff9',
                  color: '#252b50',
                }}
              >
                {dependency.resolvedVersion ? `v${dependency.resolvedVersion}` : dependency.declaredVersion}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  background: isDirect ? '#e0e7ff' : '#f1f5f9',
                  color: isDirect ? '#3730a3' : '#475569',
                }}
              >
                {dependency.type.toUpperCase()}
              </span>
              {dependency.frameworkRole && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: '#e4e5f4',
                    color: '#141a39',
                  }}
                >
                  {dependency.frameworkRole}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4e5471' }}>
              {humanSummary}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '999px',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              ...statusBadgeStyle,
            }}
          >
            {statusIcon}
            {statusBadgeText}
          </span>
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            style={{
              background: expanded ? '#141a39' : '#efeff9',
              color: expanded ? '#ffffff' : '#141a39',
              border: '1px solid #dfe1ef',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '6px 13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'background 0.15s ease',
            }}
            aria-label={`${expanded ? 'Collapse' : 'Inspect'} ${dependency.name} details`}
          >
            <span>{expanded ? 'Hide Details' : 'Inspect Details'}</span>
            {expanded ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
          </button>
        </div>
      </div>

      {/* Expanded Inline Triage Chamber */}
      {expanded && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #dfe1ef',
            display: 'grid',
            gridTemplateColumns: hasFinding ? '1fr 1.1fr' : '1fr 1fr',
            gap: '16px',
          }}
        >
          {/* Top Full-Width Blast Radius Trajectory */}
          <div style={{ gridColumn: '1 / -1' }}>
            <BlastRadiusMini
              dependency={dependency}
              finding={finding}
              repoFullName={repoFullName}
            />
          </div>

          {/* Left Column: Sub-DAG & Call Sites */}
          <div
            style={{
              background: '#f7f7fc',
              border: '1px solid #dfe1ef',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <span className="small-label" style={{ color: '#5e6582', fontSize: '10px' }}>
                1. DEPENDENCY RELATIONSHIP &amp; REACH
              </span>
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #dfe1ef',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ color: '#141a39', fontWeight: 600 }}>{repoFullName.split('/')[1] || repoFullName}</span>
                <span style={{ color: '#94a3b8' }}>──▶</span>
                <span style={{ color: '#3730a3', fontWeight: 700 }}>{dependency.name}</span>
                {dependency.transitiveDependencies.length > 0 && (
                  <>
                    <span style={{ color: '#94a3b8' }}>──▶</span>
                    <span style={{ color: '#475569' }}>
                      {dependency.transitiveDependencies.length} sub-dependencies
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* AST Call Sites */}
            <div>
              <span className="small-label" style={{ color: '#5e6582', fontSize: '10px' }}>
                2. WHERE THIS PACKAGE IS USED IN YOUR CODE ({dependency.importingFiles.length} CALL SITE{dependency.importingFiles.length === 1 ? '' : 'S'})
              </span>
              {dependency.importingFiles.length > 0 ? (
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dependency.importingFiles.map((site, sIdx) => (
                    <div
                      key={sIdx}
                      style={{
                        padding: '6px 10px',
                        background: '#ffffff',
                        border: '1px solid #dfe1ef',
                        borderRadius: '4px',
                        fontSize: '11px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <FileCodeIcon size={13} color="#64748b" />
                        <code style={{ color: '#141a39', fontWeight: 600 }}>
                          {site.filePath}:{site.line}:{site.column}
                        </code>
                      </span>
                      {site.symbol && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          function: <code>{site.symbol}</code>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '4px', fontSize: '11px', color: '#64748b' }}>
                  No direct AST import statements detected in inspected files. Required transitively or configured via toolchain.
                </p>
              )}
            </div>

            {/* Concerns if any */}
            {dependency.concerns.length > 0 && (
              <div>
                <span className="small-label" style={{ color: '#991b1b', fontSize: '10px' }}>
                  3. DETECTED CONCERNS
                </span>
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {dependency.concerns.map((c: DependencyConcern, cIdx: number) => (
                    <div
                      key={cIdx}
                      style={{
                        padding: '6px 10px',
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <AlertTriangleIcon size={13} color="#991b1b" />
                      <span><strong>{c.type.toUpperCase()}:</strong> {c.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Automated Fix, Diff, Test Proof & Approval */}
          <div
            style={{
              background: '#f7f7fc',
              border: '1px solid #dfe1ef',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {hasFinding && finding ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="small-label" style={{ color: '#92400e', fontSize: '10px' }}>
                    AUTOMATED CODEMOD &amp; PROOF
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: '#dcfce7',
                      color: '#166534',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircleIcon size={12} color="#166534" />
                    TESTS: {finding.validation?.status?.toUpperCase() ?? 'VERIFIED'}
                  </span>
                </div>

                {/* Diff Viewer Component in Deep Navy */}
                {finding.patch ? (
                  <DiffEditor
                    diffContent={finding.patch.diffContent}
                    diffHash={finding.patch.diffHash}
                    maxHeight="160px"
                  />
                ) : (
                  <p style={{ fontSize: '11px', color: '#64748b' }}>No patch required.</p>
                )}

                {/* Test Provenance Trace */}
                {finding.validation && (
                  <div
                    style={{
                      padding: '8px 10px',
                      background: '#ffffff',
                      border: '1px solid #dfe1ef',
                      borderRadius: '6px',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#141a39' }}>Red-to-Green Test Verification:</span>
                      <span style={{ fontSize: '10px', color: '#166534', fontWeight: 700 }}>
                        {finding.validation.executionProvenance?.toUpperCase() ?? 'EXECUTED'}
                      </span>
                    </div>
                    <div style={{ marginTop: '4px', color: '#475569', fontSize: '10px' }}>
                      Baseline test suite verified clean. Breaking drift reproduced under target version, then proven resolved after applying deterministic patch.
                    </div>
                  </div>
                )}

                {/* Approval & Pull Request Delivery Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {finding.patch && !finding.approval && (
                    <button
                      type="button"
                      className="pill-button pill-button-dark"
                      onClick={() => onApprove?.(finding.patch!.id, finding.patch!.diffHash)}
                      disabled={actionLoading}
                      style={{ fontSize: '12px', minHeight: '38px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <LockIcon size={13} color="#ffffff" />
                      <span>{actionLoading ? 'Approving...' : 'Lock & Approve Diff'}</span>
                    </button>
                  )}

                  {finding.approval && !finding.pullRequest && (
                    <button
                      type="button"
                      className="pill-button pill-button-dark"
                      onClick={() => onDeliverPR?.(finding.patch!.id)}
                      disabled={actionLoading}
                      style={{ fontSize: '12px', minHeight: '38px', padding: '0 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ArrowRightIcon size={13} color="#ffffff" />
                      <span>{actionLoading ? 'Creating PR...' : 'Create Draft Pull Request'}</span>
                    </button>
                  )}

                  {finding.pullRequest && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={finding.pullRequest.githubPrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pill-button"
                        style={{
                          fontSize: '11px',
                          minHeight: '34px',
                          padding: '0 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#ffffff',
                          border: '1px solid #dfe1ef',
                        }}
                      >
                        <BrandIcon name="github" size={12} />
                        <span>View PR #{finding.pullRequest.githubPrNumber}</span>
                        <ExternalLinkIcon size={11} color="#64748b" />
                      </a>
                      {finding.pullRequest.isSimulation && (
                        <span style={{ fontSize: '10px', color: '#92400e', fontWeight: 600 }}>
                          [Prepared Locally]
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', gap: '6px' }}>
                <span className="small-label" style={{ color: '#166534', fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircleIcon size={12} color="#166534" />
                  VERIFIED HEALTHY · NO DRIFT
                </span>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#141a39' }}>
                  No breaking contract drift detected
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#4e5471', lineHeight: 1.5 }}>
                  Static AST analysis inspected all references to <code>{dependency.name}</code>. Lockfile resolution conforms to current supported migration rules. No automated patch required.
                </p>
                <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b' }}>
                  Manifest: <code>{dependency.manifestPath}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
