'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircleIcon, TrypatchbayMark } from '@/app/components/UiIcons';

export type SupportedPlan = 'developer' | 'repository' | 'organization' | 'enterprise';

interface PlanDetail {
  id: SupportedPlan;
  name: string;
  badge: string;
  priceUsd: number;
  period: string;
  desc: string;
  features: string[];
}

const PLANS: Record<SupportedPlan, PlanDetail> = {
  developer: {
    id: 'developer',
    name: 'Developer Preview',
    badge: 'FREE',
    priceUsd: 0,
    period: 'forever',
    desc: 'Free AST scanning and local deterministic proof loop.',
    features: [
      'Unlimited local AST scans',
      'AST call-site mapping engine',
      'Deterministic patch generator',
      '1 free automated PR / month',
      'Tamper-evident proof bundles',
    ],
  },
  repository: {
    id: 'repository',
    name: 'Repository Tier',
    badge: 'POPULAR',
    priceUsd: 49,
    period: 'per repo / month',
    desc: 'Continuous upstream watching, blast radius mapping, and unlimited verified PR delivery.',
    features: [
      '1 connected repository',
      'Continuous 24/7 upstream watching',
      'Unlimited verified migration PRs',
      'GitHub App single-use human approvals',
      'Fail-closed AST sandboxing',
    ],
  },
  organization: {
    id: 'organization',
    name: 'Organization Tier',
    badge: 'TEAMS',
    priceUsd: 299,
    period: 'per org / month',
    desc: 'Unlimited repositories with team RBAC, custom migration rules, and priority runners.',
    features: [
      'Unlimited connected repositories',
      'Custom internal API migration rules',
      'Multi-member team RBAC controls',
      'Priority isolated runner queues',
      'Tamper-evident proof audit trails',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Contract',
    badge: 'ANNUAL',
    priceUsd: 15000,
    period: 'annual contract',
    desc: 'Dedicated microVM sandboxing runners, private registry support, and custom SLAs.',
    features: [
      'Dedicated microVM sandboxing runners',
      'Private npm & internal registry support',
      'Custom SSO / SAML & tenant data isolation',
      'SOC 2 compliance readiness & dedicated SLA',
      'Direct founder & engineering Slack channel',
    ],
  },
};

export interface PayPalUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: SupportedPlan;
  onUpgradeSuccess?: (plan?: SupportedPlan) => void;
  onPlanActivated?: (plan?: SupportedPlan) => void;
  userEmail?: string;
  tenantName?: string;
}

export function PayPalUpgradeModal({
  isOpen,
  onClose,
  initialPlan = 'repository',
  onUpgradeSuccess,
  onPlanActivated,
  userEmail,
  tenantName,
}: PayPalUpgradeModalProps) {
  const [userSelectedPlan, setUserSelectedPlan] = useState<SupportedPlan | null>(null);
  const selectedPlan = userSelectedPlan ?? initialPlan;
  const [loading, setLoading] = useState(false);
  const [paypalConfig, setPaypalConfig] = useState<{
    configured: boolean;
    paymentUrl: string | null;
    priceUsd: number;
  }>({
    configured: false,
    paymentUrl: null,
    priceUsd: PLANS[initialPlan]?.priceUsd ?? 49,
  });

  const notifySuccess = (plan: SupportedPlan) => {
    if (onUpgradeSuccess) onUpgradeSuccess(plan);
    if (onPlanActivated) onPlanActivated(plan);
  };

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/billing/paypal?plan=${selectedPlan}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setPaypalConfig({
            configured: data.configured,
            paymentUrl: data.paymentUrl,
            priceUsd: data.priceUsd ?? PLANS[selectedPlan].priceUsd,
          });
        }
      })
      .catch(() => {
        // Fall back gracefully
      });
  }, [isOpen, selectedPlan]);

  if (!isOpen) return null;

  const currentPlan = PLANS[selectedPlan] || PLANS.repository;

  const handleDemoActivate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/paypal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          subscriptionId: `sub_paypal_${selectedPlan}_${Date.now()}`,
          userEmail,
          tenantName,
        }),
      });
      if (res.ok) {
        notifySuccess(selectedPlan);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalRedirect = () => {
    if (paypalConfig.paymentUrl) {
      window.open(paypalConfig.paymentUrl, '_blank', 'noopener,noreferrer');
      notifySuccess(selectedPlan);
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
          maxWidth: '560px',
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
                PAYPAL CHECKOUT &middot; TRYPATCHBAY
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

          {/* Tier Switcher Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              marginTop: '18px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            {(['repository', 'organization', 'enterprise'] as SupportedPlan[]).map(planId => {
              const p = PLANS[planId];
              const isSelected = selectedPlan === planId;
              return (
                <button
                  key={planId}
                  type="button"
                  onClick={() => setUserSelectedPlan(planId)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#0f172a' : '#94a3b8',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {p.name.replace(' Tier', '').replace(' Contract', '')} (${p.priceUsd >= 1000 ? `$${p.priceUsd / 1000}k` : `$${p.priceUsd}`})
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff' }}>
                ${currentPlan.priceUsd >= 1000 ? `${(currentPlan.priceUsd / 1000).toLocaleString()}k` : currentPlan.priceUsd}
              </span>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {currentPlan.period}</span>
            </div>
            <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '6px 0 0' }}>
              {currentPlan.desc}
            </p>
          </div>
        </div>

        {/* Modal Body & Features */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.04em', marginBottom: '12px' }}>
            WHAT IS INCLUDED IN {currentPlan.name.toUpperCase()}:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {currentPlan.features.map((feat, idx) => (
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
                padding: '13px 20px',
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
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
              }}
            >
              <span>
                {loading
                  ? 'Connecting to PayPal...'
                  : `Pay with PayPal ($${currentPlan.priceUsd >= 1000 ? (currentPlan.priceUsd).toLocaleString() : currentPlan.priceUsd}.00 USD)`}
              </span>
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>
              Official PayPal Checkout. Payouts are routed directly to your PayPal account. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
