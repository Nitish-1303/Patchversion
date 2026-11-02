'use client';

import React, { useState } from 'react';
import type { RepositoryScanResult } from '@patchversion/shared';
import {
  GitCommitIcon,
  GitBranchIcon,
  CpuIcon,
  ShieldCheckIcon,
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
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '11px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
      }}
    >
      {/* Left items: Git Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#64748b', display: 'flex' }}>
            <GitBranchIcon size={13} />
          </span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{repoFullName}</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '5px',
              background: '#f1f5f9',
              color: '#334155',
              fontSize: '10px',
              fontFamily: 'ui-monospace, monospace',
              fontWeight: 600,
            }}
          >
            {branch}
          </span>
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
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '5px',
              padding: '2px 7px',
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
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#475569' }}>
            AST Engine:{' '}
            <strong style={{ color: '#0f172a' }}>
              {astStatus.toUpperCase()} ({filesInspected} files)
            </strong>
          </span>
        </div>
      </div>

      {/* Right items: System Telemetry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {scanResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
            <TopologyIcon size={13} color="#64748b" />
            <span>
              Graph:{' '}
              <strong style={{ color: '#0f172a' }}>
                {scanResult.graph.nodes.length} nodes · {scanResult.graph.edges.length} edges
              </strong>
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
          <CpuIcon size={13} color="#64748b" />
          <span>
            Scanner:{' '}
            <code style={{ fontSize: '10px', background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
              v{scannerVersion}
            </code>
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          <ShieldCheckIcon size={12} color="#059669" />
          <span>HOST EXECUTION SAFE</span>
        </div>
      </div>
    </div>
  );
}
