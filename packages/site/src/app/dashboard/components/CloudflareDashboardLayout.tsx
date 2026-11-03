'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrandIcon } from '@/app/components/BrandIcons';

interface CloudflareDashboardLayoutProps {
  userEmail?: string;
  onSignOut?: () => void;
  children?: React.ReactNode;
  activeRepositoryName?: string;
  onOpenTriageStudio?: () => void;
}

export function CloudflareDashboardLayout({
  userEmail = 'Yelurunitish006@gmail.com',
  onSignOut,
  children,
  activeRepositoryName = 'Nitish-1303/CipherBill',
  onOpenTriageStudio,
}: CloudflareDashboardLayoutProps) {
  // Navigation & View state
  const [activeMenu, setActiveMenu] = useState<'registrations' | 'overview' | 'transfers' | 'repos' | 'observability' | 'compute' | 'ai' | 'security' | 'zerotrust'>('registrations');
  const [domainsExpanded, setDomainsExpanded] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskAiModal, setShowAskAiModal] = useState(false);
  const [askAiQuery, setAskAiQuery] = useState('');
  const [askAiResponse, setAskAiResponse] = useState<string | null>(null);

  // Checkout configuration state
  const [years, setYears] = useState(1);
  const [autoRenew, setAutoRenew] = useState(true);
  const [hasRegistrantContact, setHasRegistrantContact] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactName, setContactName] = useState('Yeluru Nitish');
  const [contactCountry, setContactCountry] = useState('India (IN)');
  const [targetDomain, setTargetDomain] = useState<'trypatchbay.app' | 'cipherbill.dev'>('trypatchbay.app');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeTabMode, setActiveTabMode] = useState<'checkout' | 'workspace'>('checkout');

  const basePricePerYear = 8.20;
  const subtotal = (basePricePerYear * years).toFixed(2);
  const renewalPrice = (14.20 * years).toFixed(2);

  // Expiration date formatted for the selected years
  const expirationYear = 2026 + years;
  const expirationText = `Expires on Nov 3, ${expirationYear}`;

  // Keyboard shortcut for Ctrl/Cmd+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('cf-quick-search');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAskAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askAiQuery.trim()) return;
    setAskAiResponse(
      `Analyzing "${askAiQuery}" across TryPatchBay Cloud MicroVM Fleet and DNS records. Domain trypatchbay.app is configured with automated nameservers, HTTPS encryption, and zero-break dependency verification.`,
    );
  };

  const handleContinueToPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
    }, 1200);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <header
        style={{
          height: '56px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: Cloudflare Cloud Logo + Account Dropdown + Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Cloudflare Orange Cloud Icon */}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} title="Cloudflare Dashboard">
            <svg width="28" height="20" viewBox="0 0 100 68" fill="none" aria-label="Cloudflare Logo">
              <path
                d="M74.8 28.5c-1.8-12.8-12.8-22.5-26.1-22.5-11.4 0-21.3 7.1-25.1 17.5C10.7 24.6 0 35.5 0 49c0 14.6 11.8 26.5 26.5 26.5h48.3c13.9 0 25.2-11.3 25.2-25.2 0-11.9-8.4-21.8-19.9-24.3l-5.3-1.5v4z"
                fill="#f6821f"
              />
              <path
                d="M71.4 49.3c.7-2.6.4-5.3-.9-7.5-1.3-2.2-3.4-3.6-5.9-4.1l-3.3-.6v-3.4c0-7.7-6.2-13.9-13.9-13.9-6.3 0-11.7 4.2-13.3 10.3l-.8 3.2-3.3.4c-6.1.8-10.7 6-10.7 12.1 0 6.8 5.5 12.3 12.3 12.3h36.8c5.4 0 9.8-4.4 9.8-9.8 0-3.3-1.6-6.2-4.1-7.8l-3.6-1.2z"
                fill="#faad3f"
              />
            </svg>
          </Link>

          {/* Account Dropdown Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              fontSize: '13px',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title={`Active account: ${userEmail}`}
          >
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: 1, color: '#9ca3af' }}>
              <span>▲</span>
              <span>▼</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#e5e7eb' }} />

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Registrar</span>
            </span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span>Register domain</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>Checkout</span>
          </nav>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Ask AI Pill Button */}
          <button
            type="button"
            onClick={() => setShowAskAiModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <span>Ask AI</span>
          </button>

          {/* Support Link */}
          <a
            href="/docs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '13px',
              color: '#374151',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Support</span>
          </a>

          {/* User Profile Avatar Icon */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              cursor: 'pointer',
              background: '#f9fafb',
            }}
            onClick={onSignOut}
            title={onSignOut ? 'Sign out' : userEmail}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </header>

      {/* 2. THREE-PANE MAIN BODY CONTAINER */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside
          style={{
            width: sidebarCollapsed ? '64px' : '240px',
            borderRight: '1px solid #e5e7eb',
            background: '#ffffff',
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            transition: 'width 0.2s ease',
          }}
        >
          <div>
            {/* Quick Search Input */}
            {!sidebarCollapsed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  id="cf-quick-search"
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                    background: 'transparent',
                    color: '#111827',
                  }}
                />
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#9ca3af',
                    background: '#f3f4f6',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb',
                    flexShrink: 0,
                  }}
                >
                  Ctrl K
                </span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            )}

            {/* Main Menu Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <button
                type="button"
                onClick={() => setActiveMenu('overview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'overview' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'overview' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  fontWeight: activeMenu === 'overview' ? 600 : 400,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {!sidebarCollapsed && <span>Account home</span>}
              </button>

              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {!sidebarCollapsed && <span>Recents</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              {/* Domains Group (Expanded) */}
              <div>
                <button
                  type="button"
                  onClick={() => setDomainsExpanded(!domainsExpanded)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    background: 'transparent',
                    color: '#111827',
                    fontSize: '13px',
                    fontWeight: 500,
                    border: 'none',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    {!sidebarCollapsed && <span>Domains</span>}
                  </div>
                  {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '11px' }}>{domainsExpanded ? '˅' : '›'}</span>}
                </button>

                {domainsExpanded && !sidebarCollapsed && (
                  <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu('overview');
                        setActiveTabMode('workspace');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: activeMenu === 'overview' ? '#f3f4f6' : 'transparent',
                        color: activeMenu === 'overview' ? '#111827' : '#4b5563',
                        fontWeight: activeMenu === 'overview' ? 600 : 400,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu('registrations');
                        setActiveTabMode('checkout');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: activeMenu === 'registrations' ? '#f3f4f6' : 'transparent',
                        color: activeMenu === 'registrations' ? '#111827' : '#4b5563',
                        fontWeight: activeMenu === 'registrations' ? 600 : 400,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      Registrations
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMenu('transfers');
                        setActiveTabMode('workspace');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: activeMenu === 'transfers' ? '#f3f4f6' : 'transparent',
                        color: activeMenu === 'transfers' ? '#111827' : '#4b5563',
                        fontWeight: activeMenu === 'transfers' ? 600 : 400,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      Transfers
                    </button>
                  </div>
                )}
              </div>

              {/* Observability with "New" Badge */}
              <button
                type="button"
                onClick={() => {
                  setActiveMenu('observability');
                  setActiveTabMode('workspace');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'observability' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'observability' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  fontWeight: activeMenu === 'observability' ? 600 : 400,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  {!sidebarCollapsed && <span>Observability</span>}
                  {!sidebarCollapsed && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      New
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              {/* Section: BUILD */}
              {!sidebarCollapsed && (
                <div style={{ marginTop: '16px', marginBottom: '4px', paddingLeft: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Build
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('compute');
                  setActiveTabMode('workspace');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'compute' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'compute' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  {!sidebarCollapsed && <span>Compute</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('ai');
                  setActiveTabMode('workspace');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'ai' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'ai' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                  {!sidebarCollapsed && <span>AI</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                  {!sidebarCollapsed && <span>Storage & databases</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                    <line x1="7" y1="2" x2="7" y2="22" />
                    <line x1="17" y1="2" x2="17" y2="22" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                  </svg>
                  {!sidebarCollapsed && <span>Images & Stream</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
                    <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
                    <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
                  </svg>
                  {!sidebarCollapsed && <span>Realtime</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              {/* Section: PROTECT & CONNECT */}
              {!sidebarCollapsed && (
                <div style={{ marginTop: '16px', marginBottom: '4px', paddingLeft: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Protect & connect
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('security');
                  setActiveTabMode('workspace');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'security' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'security' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {!sidebarCollapsed && <span>Application security</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMenu('zerotrust');
                  setActiveTabMode('workspace');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: activeMenu === 'zerotrust' ? '#f3f4f6' : 'transparent',
                  color: activeMenu === 'zerotrust' ? '#111827' : '#4b5563',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {!sidebarCollapsed && <span>Zero Trust</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>}
              </button>
            </div>
          </div>

          {/* Bottom Sidebar Collapse Toggle */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                padding: '4px',
              }}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* CENTER MAIN CANVAS */}
        <main
          style={{
            flex: 1,
            padding: '36px 48px',
            overflowY: 'auto',
            background: '#ffffff',
            maxWidth: '900px',
          }}
        >
          {/* Top Switcher: Cloudflare Checkout View vs Triage Studio View */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'inline-flex', background: '#f3f4f6', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTabMode('checkout')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTabMode === 'checkout' ? '#ffffff' : 'transparent',
                  color: activeTabMode === 'checkout' ? '#111827' : '#6b7280',
                  boxShadow: activeTabMode === 'checkout' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                }}
              >
                Domain Checkout
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTabMode('workspace');
                  if (onOpenTriageStudio) onOpenTriageStudio();
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTabMode === 'workspace' ? '#ffffff' : 'transparent',
                  color: activeTabMode === 'workspace' ? '#111827' : '#6b7280',
                  boxShadow: activeTabMode === 'workspace' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                }}
              >
                Autonomous Migrations & Triage
              </button>
            </div>

            {/* Target Domain / Repository Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Connected Target:</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1e40af',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {activeTabMode === 'checkout' ? targetDomain : activeRepositoryName}
              </span>
            </div>
          </div>

          {activeTabMode === 'checkout' ? (
            /* EXACT CLOUDFLARE CHECKOUT CARD CONTENT */
            <div>
              {/* Heading & Subtitle */}
              <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                Checkout
              </h1>
              <p style={{ marginTop: '8px', fontSize: '14px', color: '#4b5563', lineHeight: 1.5, maxWidth: '640px' }}>
                Confirm registration details, adjust settings and review your order. Domains will automatically use
                Cloudflare nameservers for security and performance.
              </p>

              {/* Target Domain Name Headline */}
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginTop: '36px', marginBottom: '14px' }}>
                {targetDomain}
              </h3>

              {/* Main Bordered Card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '24px 28px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}
              >
                {/* Row 1: Registration period */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#111827', display: 'block' }}>
                      Registration period
                    </strong>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {expirationText}
                    </span>
                  </div>

                  {/* Quantity Counter (- 1 year +) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      background: '#ffffff',
                      padding: '4px 8px',
                      gap: '12px',
                      userSelect: 'none',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setYears(Math.max(1, years - 1))}
                      disabled={years <= 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: years <= 1 ? '#d1d5db' : '#374151',
                        cursor: years <= 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        padding: '0 4px',
                        fontWeight: 600,
                      }}
                      title="Decrease years"
                    >
                      −
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', minWidth: '46px', textAlign: 'center' }}>
                      {years} year{years > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setYears(Math.min(10, years + 1))}
                      disabled={years >= 10}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: years >= 10 ? '#d1d5db' : '#374151',
                        cursor: years >= 10 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        padding: '0 4px',
                        fontWeight: 600,
                      }}
                      title="Increase years"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f3f4f6' }} />

                {/* Row 2: Automatic renewal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#111827', display: 'block' }}>
                      Automatic renewal
                    </strong>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      Auto-renews at ${renewalPrice} per year
                    </span>
                  </div>

                  {/* Blue Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setAutoRenew(!autoRenew)}
                    aria-checked={autoRenew}
                    role="switch"
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      background: autoRenew ? '#1e69ff' : '#d1d5db',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.2s ease',
                      padding: '2px',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: autoRenew ? '22px' : '2px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                      }}
                    />
                  </button>
                </div>

                <div style={{ height: '1px', background: '#f3f4f6' }} />

                {/* Row 3: Registrant information */}
                <div>
                  <strong style={{ fontSize: '15px', color: '#111827', display: 'block', marginBottom: '8px' }}>
                    Registrant information
                  </strong>

                  <div
                    style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: hasRegistrantContact ? '#111827' : '#6b7280' }}>
                      {hasRegistrantContact ? `${contactName} (${contactCountry})` : 'No registrant contact'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowAddContactModal(true)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '5px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#111827',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {hasRegistrantContact ? 'Edit' : '+ Add'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Informational Notes below card */}
              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>
                <p style={{ margin: 0 }}>
                  The .app extension requires HTTPS for websites to load securely. Cloudflare provides free SSL certificates
                  automatically. See our <a href="/docs/security" style={{ color: '#2563eb', textDecoration: 'none' }}>SSL documentation ↗</a>.
                </p>
                <p style={{ margin: 0 }}>
                  Cloudflare Registrar redacts registrant personal information from its public WHOIS service. The registry
                  may still display this information in its own WHOIS service, outside Cloudflare&apos;s control.
                </p>
              </div>

              {/* Payment Success Toast */}
              {paymentSuccess && (
                <div
                  style={{
                    marginTop: '24px',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#065f46',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span>
                    <span>
                      Order for <strong>{targetDomain}</strong> confirmed! DNS nameservers and Cloud MicroVM Fleet endpoints are active.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentSuccess(false)}
                    style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* WORKSPACE / AST TRIAGE EMBED */
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 }}>
                  Autonomous Migration Cockpit
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#4b5563' }}>
                  Target: <strong>{activeRepositoryName}</strong> · Red-to-green proof execution verified inside Cloud MicroVM Fleet.
                </p>
              </div>

              {children}
            </div>
          )}
        </main>

        {/* RIGHT ORDER SUMMARY RAIL */}
        <aside
          style={{
            width: '320px',
            borderLeft: '1px solid #e5e7eb',
            background: '#ffffff',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#111827', margin: '0 0 24px' }}>
              Order summary
            </h3>

            {/* Item Line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827', display: 'block' }}>
                  {targetDomain}
                </span>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  Registration for {years} year{years > 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  ${subtotal}
                </span>
                <button
                  type="button"
                  onClick={() => setYears(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '2px',
                  }}
                  title="Reset item"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '20px 0 16px' }} />

            {/* Subtotal Line */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>Subtotal</span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>${subtotal}</span>
            </div>
          </div>

          {/* Sticky Bottom Action */}
          <div style={{ paddingTop: '24px' }}>
            <button
              type="button"
              onClick={handleContinueToPayment}
              disabled={isProcessingPayment}
              style={{
                width: '100%',
                background: '#1e69ff',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isProcessingPayment ? 'wait' : 'pointer',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(30, 105, 255, 0.25)',
                transition: 'background 0.15s ease',
                opacity: isProcessingPayment ? 0.7 : 1,
              }}
            >
              {isProcessingPayment ? 'Processing...' : 'Continue to payment'}
            </button>

            <p style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280', lineHeight: 1.4, margin: '12px 0 0' }}>
              Domain registrations are non-refundable and subject to applicable taxes. Confirm spelling before purchase.
            </p>
          </div>
        </aside>
      </div>

      {/* 3. MODALS */}
      {/* Registrant Contact Modal */}
      {showAddContactModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>
              Registrant Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Country / Region
                </label>
                <input
                  type="text"
                  value={contactCountry}
                  onChange={(e) => setContactCountry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    fontSize: '13px',
                    color: '#6b7280',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowAddContactModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setHasRegistrantContact(true);
                  setShowAddContactModal(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1e69ff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask AI Quick Drawer / Modal */}
      {showAskAiModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>✨</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Ask AI Assistant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAskAiModal(false);
                  setAskAiResponse(null);
                }}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAskAiSubmit}>
              <textarea
                placeholder="Ask anything about your domain checkout, nameservers, or automated migrations..."
                value={askAiQuery}
                onChange={(e) => setAskAiQuery(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e69ff',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Ask
                </button>
              </div>
            </form>

            {askAiResponse && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: 1.5,
                }}
              >
                {askAiResponse}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
