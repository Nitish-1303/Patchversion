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
    color: '#475569',
    border: '1px solid #cbd5e1',
  };

  if (badge?.variant === 'success') {
    badgeStyle = {
      background: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    };
  } else if (badge?.variant === 'warning') {
    badgeStyle = {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    };
  } else if (badge?.variant === 'info') {
    badgeStyle = {
      background: '#e0e7ff',
      color: '#3730a3',
      border: '1px solid #c7d2fe',
    };
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: badge?.variant === 'warning' ? '1px solid #fcd34d' : '1px solid #dfe1ef',
        borderRadius: '12px',
        padding: '18px 20px',
        boxShadow: '0 2px 8px rgba(20, 26, 57, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#f7f7fc',
                border: '1px solid #dfe1ef',
                color: '#141a39',
              }}
            >
              {icon}
            </span>
            <span className="small-label" style={{ fontSize: '10px', color: '#5e6582' }}>
              {label}
            </span>
          </div>

          {badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                ...badgeStyle,
              }}
            >
              {badge.text}
            </span>
          )}
        </div>

        <div style={{ fontSize: '20px', fontWeight: 800, color: '#141a39', marginTop: '10px' }}>
          {metric}
        </div>
      </div>

      <div style={{ fontSize: '12px', color: '#4e5471', marginTop: '10px', lineHeight: 1.4 }}>
        {subtext}
      </div>

      {action && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
          <button
            type="button"
            onClick={action.onClick}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#3730a3',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{action.label}</span>
          </button>
        </div>
      )}
    </div>
  );
}
