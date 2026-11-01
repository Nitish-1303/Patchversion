'use client';

import React, { useState } from 'react';
import { LockIcon } from '@/app/components/UiIcons';

interface DiffEditorProps {
  diffContent: string;
  diffHash: string;
  maxHeight?: string;
}

export function DiffEditor({ diffContent, diffHash, maxHeight = '200px' }: DiffEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(diffContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = diffContent.split('\n');

  return (
    <div
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #1f293d',
        background: '#141a39',
        boxShadow: '0 4px 14px rgba(20, 26, 57, 0.15)',
      }}
    >
      {/* Top Diff Header */}
      <div
        style={{
          padding: '8px 12px',
          background: '#0d1127',
          borderBottom: '1px solid #1f293d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#a5b4fc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LockIcon size={12} color="#a5b4fc" />
          <span style={{ fontWeight: 600 }}>Deterministic AST Patch Diff</span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'monospace',
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
            }}
          >
            SHA-256: {diffHash.slice(0, 12)}...
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          {copied ? '✓ Copied' : 'Copy Diff'}
        </button>
      </div>

      {/* Code Lines with Syntax Colors */}
      <pre
        style={{
          margin: 0,
          padding: '12px 14px',
          fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
          fontSize: '11px',
          lineHeight: 1.6,
          color: '#f8fafc',
          maxHeight,
          overflowX: 'auto',
          overflowY: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {lines.map((line, idx) => {
          let lineBg = 'transparent';
          let textColor = '#cbd5e1';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineBg = 'rgba(16, 185, 129, 0.15)';
            textColor = '#34d399';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineBg = 'rgba(239, 68, 68, 0.15)';
            textColor = '#f87171';
          } else if (line.startsWith('@@')) {
            textColor = '#a5b4fc';
            lineBg = 'rgba(99, 102, 241, 0.08)';
          }

          return (
            <div
              key={idx}
              style={{
                backgroundColor: lineBg,
                color: textColor,
                padding: '0 4px',
                borderRadius: '2px',
              }}
            >
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
