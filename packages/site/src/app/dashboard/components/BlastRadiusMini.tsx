'use client';

import React from 'react';
import { BrandIcon } from '@/app/components/BrandIcons';
import {
  FileCodeIcon,
  CheckCircleIcon,
  PulseDotIcon,
} from '@/app/components/UiIcons';
import type { FindingInfo } from './TriageCard';
import type { MappedDependency } from '@patchversion/shared';

interface BlastRadiusMiniProps {
  dependency: MappedDependency;
  finding?: FindingInfo;
  repoFullName: string;
}

export function BlastRadiusMini({ dependency, finding, repoFullName }: BlastRadiusMiniProps) {
  const hasFinding = Boolean(finding);
  const repoName = repoFullName.split('/')[1] || repoFullName;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dfe1ef',
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="small-label" style={{ fontSize: '10px', color: '#5e6582' }}>
          DEPENDENCY BLAST RADIUS &amp; IMPACT TRAJECTORY
        </span>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#64748b',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <PulseDotIcon color={hasFinding ? '#f59e0b' : '#10b981'} size={6} />
          {hasFinding ? 'Active Drift Trajectory' : 'Clean Topology Reach'}
        </span>
      </div>

      {/* Visual Step-by-Step Trajectory Flow */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {/* Node 1: Root Manifest */}
        <div
          style={{
            padding: '8px 10px',
            background: '#f7f7fc',
            border: '1px solid #dfe1ef',
            borderRadius: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>ROOT MANIFEST</div>
          <div style={{ fontWeight: 700, color: '#141a39', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {repoName}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            {dependency.manifestPath}
          </div>
        </div>

        {/* Node 2: Target Package */}
        <div
          style={{
            padding: '8px 10px',
            background: hasFinding ? '#fffbeb' : '#f7f7fc',
            border: hasFinding ? '1px solid #fcd34d' : '1px solid #dfe1ef',
            borderRadius: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ fontSize: '9px', color: hasFinding ? '#92400e' : '#64748b', fontWeight: 700 }}>
            {dependency.type.toUpperCase()}
          </div>
          <div style={{ fontWeight: 700, color: '#141a39', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <BrandIcon name="npm" size={11} useBrandColor />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dependency.name}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
            v{dependency.resolvedVersion || dependency.declaredVersion}
          </div>
        </div>

        {/* Node 3: AST Call Sites */}
        <div
          style={{
            padding: '8px 10px',
            background: '#f7f7fc',
            border: '1px solid #dfe1ef',
            borderRadius: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>CALL SITES</div>
          <div style={{ fontWeight: 700, color: '#141a39', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCodeIcon size={12} color="#475569" />
            <span>{dependency.importingFiles.length} file location{dependency.importingFiles.length === 1 ? '' : 's'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            AST parsed
          </div>
        </div>

        {/* Node 4: Proof / Status */}
        <div
          style={{
            padding: '8px 10px',
            background: hasFinding ? (finding?.validation?.status === 'passed' ? '#dcfce7' : '#fef3c7') : '#dcfce7',
            border: hasFinding ? (finding?.validation?.status === 'passed' ? '1px solid #86efac' : '1px solid #fcd34d') : '1px solid #86efac',
            borderRadius: '6px',
            fontSize: '11px',
          }}
        >
          <div style={{ fontSize: '9px', color: hasFinding ? '#166534' : '#166534', fontWeight: 700 }}>
            VERIFICATION
          </div>
          <div style={{ fontWeight: 700, color: '#166534', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircleIcon size={12} color="#166534" />
            <span>{hasFinding ? (finding?.validation?.status?.toUpperCase() ?? 'PROVEN') : 'ZERO DRIFT'}</span>
          </div>
          <div style={{ fontSize: '10px', color: '#166534', marginTop: '2px' }}>
            {hasFinding ? 'Red-to-Green PASS' : 'No regressions'}
          </div>
        </div>
      </div>
    </div>
  );
}
