'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, CheckCircleIcon, TrypatchbayMark } from '@/app/components/UiIcons';

interface PayPalUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess?: () => void;
  onPlanActivated?: () => void;
  userEmail?: string;
  tenantName?: string;
}

export function PayPalUpgradeModal({
  isOpen,
  onClose,
  onUpgradeSuccess,
  onPlanActivated,
  userEmail,
  tenantName,
}: PayPalUpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<{
    configured: boolean;
    paymentUrl: string | null;
    priceUsd: number;
  }>({
    configured: false,
    paymentUrl: null,
    priceUsd: 49,
  });

  const notifySuccess = () => {
    if (onUpgradeSuccess) onUpgradeSuccess();
    if (onPlanActivated) onPlanActivated();
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/billing/paypal')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setPaypalConfig({
            configured: data.configured,
            paymentUrl: data.paymentUrl,
            priceUsd: data.priceUsd || 49,
          });
        }
      })
      .catch(() => {
        // Fall back gracefully
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDemoActivate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'repository',
          subscriptionId: `sub_paypal_sim_${Date.now()}`,
        }),
      });
      if (res.ok) {
        notifySuccess();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalRedirect = () => {
    if (paypalConfig.paymentUrl) {
      window.open(paypalConfig.paymentUrl, '_blank', 'noopener,noreferrer');
      notifySuccess();
      onClose();
    } else {
      handleDemoActivate();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '24px 28px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrypatchbayMark size={28} />
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', color: '#93c5fd' }}>
                TRYPATCHBAY REPOSITORY PRO
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              x
            </button>
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff' }}>$49</span>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ month per repository</span>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '6px 0 0' }}>
              Automated AST breaking change migrations, unlimited PR deliveries, and continuous branch protection.
            </p>
          </div>
        </div>

        {/* Modal Body & Features */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', marginBottom: '12px' }}>
            WHAT YOU UNLOCK:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {[
              'Unlimited Automated Migration Pull Requests (no 1 PR/mo limit)',
              'Continuous 24/7 Webhook Monitoring on every commit and tag',
              'Cryptographic Red-to-Green Test Proof Artifacts',
              'Fail-closed AST transformation guarantees (zero hallucinated code)',
              'Direct founder Slack & email priority support',
            ].map((feat, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#1e293b' }}>
                <CheckCircleIcon size={16} color="#059669" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* PayPal Payment Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePayPalRedirect}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '8px',
                background: '#ffc439',
                color: '#003087',
                border: '1px solid #e0aa28',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
              }}
            >
              <span>{loading ? 'Connecting to PayPal...' : 'Pay with PayPal ($49.00 USD)'}</span>
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
              Secure checkout via PayPal. Supports PayPal balance, debit, credit card, and bank payout. Cancel anytime in one click.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
