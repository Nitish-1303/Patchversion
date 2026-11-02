'use client';

import React from 'react';

interface HealthCardProps {
  icon: React.ReactNode;
  label: string;
  metric: string | number;
  subtext: string;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'neutral';
  };
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function HealthCard({ icon, label, metric, subtext, badge, action }: HealthCardProps) {
  let badgeStyle = {
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    dotColor: '#64748b',
  };

  if (badge?.variant === 'success') {
    badgeStyle = {
      background: '#ecfdf5',
      color: '#065f46',
      border: '1px solid #a7f3d0',
      dotColor: '#10b981',
    };
  } else if (badge?.variant === 'warning') {
    badgeStyle = {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
      dotColor: '#f59e0b',
    };
  } else if (badge?.variant === 'info') {
    badgeStyle = {
      background: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
      dotColor: '#3b82f6',
    };
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: badge?.variant === 'warning' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
              }}
            >
              {icon}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#64748b',
                textTransform: 'uppercase',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {label}
            </span>
          </div>

          {badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '999px',
                letterSpacing: '0.02em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: badgeStyle.background,
                color: badgeStyle.color,
                border: badgeStyle.border,
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: badgeStyle.dotColor,
                }}
              />
              {badge.text}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            marginBottom: '6px',
          }}
        >
          {metric}
        </div>

        <p
          style={{
            fontSize: '12px',
            color: '#64748b',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {subtext}
        </p>
      </div>

      {action && (
        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={action.onClick}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontSize: '11px',
              fontWeight: 600,
              color: '#2563eb',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'color 0.15s ease',
            }}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
