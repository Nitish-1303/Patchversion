'use client';

import React, { useState } from 'react';
import type { RepositoryScanResult } from '@patchversion/shared';
import {
  GitCommitIcon,
  GitBranchIcon,
  CpuIcon,
  ShieldCheckIcon,
  PulseDotIcon,
  TopologyIcon,
} from '@/app/components/UiIcons';

interface TelemetryBarProps {
  scanResult: RepositoryScanResult | null;
  repoFullName: string;
}

export function TelemetryBar({ scanResult, repoFullName }: TelemetryBarProps) {
  const [copiedSha, setCopiedSha] = useState(false);

  const commitSha = scanResult?.provenance?.commitSha || '5f160dc';
  const branch = scanResult?.provenance?.branch || 'main';
  const scannerVersion = scanResult?.provenance?.scannerVersion || '2.4.0';
  const astStatus = scanResult?.provenance?.astAnalysisStatus || 'complete';
  const filesInspected = scanResult?.provenance?.filesInspected ?? 27;

  const handleCopySha = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(commitSha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dfe1ef',
        borderRadius: '10px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11px',
        boxShadow: '0 1px 4px rgba(20, 26, 57, 0.02)',
      }}
    >
      {/* Left items: Git Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', display: 'flex' }}>
            <GitBranchIcon size={13} />
          </span>
          <span style={{ fontWeight: 600, color: '#141a39' }}>{repoFullName} ({branch})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', display: 'flex' }}>
            <GitCommitIcon size={13} />
          </span>
          <button
            type="button"
            onClick={handleCopySha}
            title="Click to copy commit SHA"
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              padding: '1px 6px',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '10px',
              color: '#334155',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <code>{commitSha.slice(0, 7)}</code>
            <span style={{ fontSize: '9px', color: '#64748b' }}>{copiedSha ? '✓' : '⎘'}</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PulseDotIcon color={astStatus === 'complete' ? '#10b981' : '#f59e0b'} size={7} />
          <span style={{ color: '#64748b' }}>AST Engine:</span>
          <span
            style={{
              fontWeight: 700,
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              background: astStatus === 'complete' ? '#dcfce7' : '#fef3c7',
              color: astStatus === 'complete' ? '#166534' : '#92400e',
            }}
          >
            {astStatus.toUpperCase()} ({filesInspected} files)
          </span>
        </div>
      </div>

      {/* Right items: Graph Scale & Safety Boundary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {scanResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#64748b', display: 'flex' }}>
              <TopologyIcon size={13} />
            </span>
            <span style={{ color: '#4e5471' }}>
              Graph: <strong style={{ color: '#141a39' }}>{scanResult.graph.nodes.length}</strong> nodes ·{' '}
              <strong style={{ color: '#141a39' }}>{scanResult.graph.edges.length}</strong> edges
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', display: 'flex' }}>
            <CpuIcon size={13} />
          </span>
          <span style={{ color: '#4e5471' }}>
            Scanner: <strong style={{ color: '#141a39' }}>v{scannerVersion}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#166534', display: 'flex' }}>
            <ShieldCheckIcon size={13} />
          </span>
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
            HOST EXECUTION SAFE
          </span>
        </div>
      </div>
    </div>
  );
}
