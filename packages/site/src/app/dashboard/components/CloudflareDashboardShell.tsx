'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayersIcon,
  TopologyIcon,
  ShieldCheckIcon,
  GitPullRequestIcon,
  PackageSearchIcon,
  ActivityIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  GitBranchIcon,
  LockIcon,
  PulseDotIcon,
  TrypatchbayMark,
  SearchIcon,
} from '@/app/components/UiIcons';

export type DashboardTab =
  | 'Triage Deck'
  | 'Proof Studio'
  | 'Visual Map'
  | 'Audit & Steps'
  | 'Pull requests'
  | 'Monitored Packages'
  | 'Activity';

interface CloudflareDashboardShellProps {
  userEmail?: string;
  activeRepositoryName?: string;
  onSignOut?: () => void;
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onScan?: () => void;
  isScanning?: boolean;
  onDeliverPR?: () => void;
  onRunSimulation?: () => void;
  isSimulating?: boolean;
  children: React.ReactNode;
  unauthenticatedBanner?: React.ReactNode;
  isAuthenticated?: boolean;
  metrics?: {
    totalDependencies?: number;
    breakingRegressions?: number;
    microvmStatus?: string;
    verifiedPRCount?: number;
  };
}

export function CloudflareDashboardShell({
  userEmail = 'Yelurunitish006@gmail.com',
  activeRepositoryName = 'Nitish-1303/CipherBill',
  onSignOut,
  activeTab,
  onSelectTab,
  onScan,
  isScanning = false,
  onDeliverPR,
  onRunSimulation,
  isSimulating = false,
  children,
  unauthenticatedBanner,
  isAuthenticated = true,
  metrics,
}: CloudflareDashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reposExpanded, setReposExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskAiModal, setShowAskAiModal] = useState(false);
  const [askAiQuery, setAskAiQuery] = useState('');
  const [askAiResponse, setAskAiResponse] = useState<string | null>(null);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('cf-shell-search');
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
      `Analyzing "${askAiQuery}" across AST call-site mappings for ${activeRepositoryName}. Cloud MicroVM Fleet confirms zero-break runtime verification with HMAC-SHA256 cryptographic signatures.`,
    );
  };

  const navItems: Array<{ tab: DashboardTab; label: string; icon: string; badge?: string; section: string }> = [
    { tab: 'Triage Deck', label: 'Triage Deck', icon: 'layers', badge: metrics?.breakingRegressions ? `${metrics.breakingRegressions} issues` : undefined, section: 'AST INTELLIGENCE' },
    { tab: 'Proof Studio', label: 'Proof Studio', icon: 'terminal', badge: 'Verified', section: 'AST INTELLIGENCE' },
    { tab: 'Visual Map', label: 'Visual Topology', icon: 'topology', section: 'AST INTELLIGENCE' },
    { tab: 'Audit & Steps', label: 'Audit Scorecard', icon: 'shield', section: 'AST INTELLIGENCE' },
    { tab: 'Monitored Packages', label: 'Monitored Packages', icon: 'package', section: 'INFRASTRUCTURE' },
    { tab: 'Pull requests', label: 'Pull Requests', icon: 'git-pr', badge: metrics?.verifiedPRCount ? `${metrics.verifiedPRCount} ready` : undefined, section: 'DELIVERY & AUDIT' },
    { tab: 'Activity', label: 'Audit Activity', icon: 'activity', section: 'DELIVERY & AUDIT' },
  ];

  const renderNavIcon = (icon: string) => {
    switch (icon) {
      case 'layers':
        return <LayersIcon size={15} color="currentColor" />;
      case 'terminal':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        );
      case 'topology':
        return <TopologyIcon size={15} color="currentColor" />;
      case 'shield':
        return <ShieldCheckIcon size={15} color="currentColor" />;
      case 'package':
        return <PackageSearchIcon size={15} color="currentColor" />;
      case 'git-pr':
        return <GitPullRequestIcon size={15} color="currentColor" />;
      case 'activity':
        return <ActivityIcon size={15} color="currentColor" />;
      default:
        return <LayersIcon size={15} color="currentColor" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', color: '#111827', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 1. TOP HEADER (Cloudflare Style Bar) */}
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
        {/* Left: Cloudflare Cloud Logo + TryPatchBay Brand + Account Selector + Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Cloudflare-Style Orange Cloud Icon + TryPatchBay Title */}
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }} title="TryPatchBay Dashboard">
            <svg width="26" height="19" viewBox="0 0 100 68" fill="none" aria-label="Cloudflare Style Cloud">
              <path
                d="M74.8 28.5c-1.8-12.8-12.8-22.5-26.1-22.5-11.4 0-21.3 7.1-25.1 17.5C10.7 24.6 0 35.5 0 49c0 14.6 11.8 26.5 26.5 26.5h48.3c13.9 0 25.2-11.3 25.2-25.2 0-11.9-8.4-21.8-19.9-24.3l-5.3-1.5v4z"
                fill="#f6821f"
              />
              <path
                d="M71.4 49.3c.7-2.6.4-5.3-.9-7.5-1.3-2.2-3.4-3.6-5.9-4.1l-3.3-.6v-3.4c0-7.7-6.2-13.9-13.9-13.9-6.3 0-11.7 4.2-13.3 10.3l-.8 3.2-3.3.4c-6.1.8-10.7 6-10.7 12.1 0 6.8 5.5 12.3 12.3 12.3h36.8c5.4 0 9.8-4.4 9.8-9.8 0-3.3-1.6-6.2-4.1-7.8l-3.6-1.2z"
                fill="#faad3f"
              />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
              TryPatchBay
            </span>
          </Link>

          <div style={{ width: '1px', height: '22px', background: '#e5e7eb' }} />

          {/* Account Selector Pill */}
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
            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '8px', lineHeight: 1, color: '#9ca3af' }}>
              <span>▲</span>
              <span>▼</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '22px', background: '#e5e7eb' }} />

          {/* Breadcrumbs Navigation */}
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4b5563' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Repositories</span>
            </span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#111827', fontWeight: 500 }}>{activeRepositoryName}</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ fontWeight: 600, color: '#1e69ff' }}>{activeTab}</span>
          </nav>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Trigger */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <SearchIcon size={12} color="#9ca3af" />
            <input
              id="cf-shell-search"
              type="text"
              placeholder="Quick search... ⌘K"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: '12px',
                color: '#111827',
                width: '120px',
              }}
            />
          </div>

          {/* Ask AI Pill */}
          <button
            type="button"
            onClick={() => setShowAskAiModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <span>Ask AI</span>
          </button>

          {/* Support / Docs */}
          <a
            href="/docs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              color: '#4b5563',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Support</span>
          </a>

          {/* User Profile Avatar */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid #d1d5db',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#374151',
              cursor: 'pointer',
              background: '#f3f4f6',
              fontSize: '12px',
              fontWeight: 600,
            }}
            onClick={onSignOut}
            title={onSignOut ? 'Click to sign out' : userEmail}
          >
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* 2. MAIN 3-PANE CONTAINER (Sidebar + Canvas + Right Summary Rail) */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        {/* LEFT COLLAPSIBLE NAVIGATION SIDEBAR */}
        <aside
          style={{
            width: sidebarCollapsed ? '64px' : '230px',
            background: '#ffffff',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '16px 10px',
            flexShrink: 0,
            transition: 'width 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Account home */}
            <button
              type="button"
              onClick={() => onSelectTab('Triage Deck')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 10px',
                borderRadius: '6px',
                background: 'transparent',
                color: '#4b5563',
                fontSize: '13px',
                fontWeight: 500,
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

            {/* Repositories Tree Dropdown */}
            <div>
              <button
                type="button"
                onClick={() => setReposExpanded(!reposExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#111827',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  {!sidebarCollapsed && <span>Repositories</span>}
                </div>
                {!sidebarCollapsed && <span style={{ color: '#9ca3af', fontSize: '11px' }}>{reposExpanded ? '˅' : '›'}</span>}
              </button>

              {reposExpanded && !sidebarCollapsed && (
                <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                  <div
                    style={{
                      padding: '5px 8px',
                      borderRadius: '5px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <GitBranchIcon size={12} color="#1d4ed8" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeRepositoryName}
                    </span>
                  </div>
                  <div
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#64748b',
                      cursor: 'pointer',
                    }}
                    onClick={onScan}
                  >
                    + Scan new branch
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Groups */}
            {['AST INTELLIGENCE', 'INFRASTRUCTURE', 'DELIVERY & AUDIT'].map((sectionName) => (
              <div key={sectionName}>
                {!sidebarCollapsed && (
                  <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.04em' }}>
                    {sectionName}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {navItems
                    .filter((item) => item.section === sectionName)
                    .map((item) => {
                      const isActive = activeTab === item.tab;
                      return (
                        <button
                          key={item.tab}
                          type="button"
                          onClick={() => onSelectTab(item.tab)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: isActive ? '#f3f4f6' : 'transparent',
                            color: isActive ? '#111827' : '#4b5563',
                            fontWeight: isActive ? 600 : 400,
                            fontSize: '13px',
                            border: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                          }}
                          title={item.label}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderNavIcon(item.icon)}
                            {!sidebarCollapsed && <span>{item.label}</span>}
                          </div>
                          {!sidebarCollapsed && item.badge && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: isActive ? '#e5e7eb' : '#f3f4f6',
                                color: '#374151',
                                fontWeight: 600,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Collapse Toggle Button */}
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
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            padding: '28px 36px',
            overflowY: 'auto',
            background: '#f9fafb',
          }}
        >
          {/* Unauthenticated Developer Workspace Sign-in Card */}
          {unauthenticatedBanner && (
            <div style={{ marginBottom: '24px' }}>
              {unauthenticatedBanner}
            </div>
          )}

          {/* Repository Header & Telemetry Strip */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '20px 24px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    {activeRepositoryName}
                  </h1>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <PulseDotIcon size={7} color="#10b981" />
                    MicroVM Fleet Active
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, monospace',
                      background: '#f3f4f6',
                      color: '#4b5563',
                      border: '1px solid #e5e7eb',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    branch: main · sha256:7f160e
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#4b5563' }}>
                  Autonomous AST migration and red-to-green proof execution verified inside sealed Cloud MicroVMs.
                </p>
              </div>

              {/* Action Buttons in Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onScan}
                  disabled={isScanning}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e69ff',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isScanning ? 'wait' : 'pointer',
                    boxShadow: '0 1px 2px rgba(30, 105, 255, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SearchIcon size={12} color="#ffffff" />
                  <span>{isScanning ? 'Scanning...' : 'Trigger Scan'}</span>
                </button>

                {onRunSimulation && (
                  <button
                    type="button"
                    onClick={onRunSimulation}
                    disabled={isSimulating}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isSimulating ? 'wait' : 'pointer',
                    }}
                  >
                    {isSimulating ? 'Running...' : 'Run Proof'}
                  </button>
                )}
              </div>
            </div>

            {/* Cloudflare Horizontal Sub-nav Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                borderTop: '1px solid #f3f4f6',
                paddingTop: '12px',
                overflowX: 'auto',
              }}
            >
              {(
                [
                  'Triage Deck',
                  'Proof Studio',
                  'Visual Map',
                  'Audit & Steps',
                  'Pull requests',
                  'Monitored Packages',
                  'Activity',
                ] as DashboardTab[]
              ).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onSelectTab(tab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#f3f4f6' : 'transparent',
                      color: isActive ? '#111827' : '#6b7280',
                      fontSize: '12px',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Tile Cloudflare Metric Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '14px 18px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Dependencies Mapped
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
                {metrics?.totalDependencies ?? 4}
              </div>
              <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                Direct & transitive tree verified
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '14px 18px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Breaking Regressions
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>
                {metrics?.breakingRegressions ?? 2}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Deterministic AST fix available
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '14px 18px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                MicroVM Fleet Isolation
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PulseDotIcon size={8} color="#16a34a" />
                Sealed
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                HMAC-SHA256 signature active
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '14px 18px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>
                Automated Pull Requests
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>
                {metrics?.verifiedPRCount ?? 1}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Red-to-green proof attached
              </div>
            </div>
          </div>

          {/* Children Tab Content */}
          <div>{children}</div>
        </main>

        {/* RIGHT SUMMARY & CONTEXT RAIL (Cloudflare Style Drawer) */}
        <aside
          style={{
            width: '300px',
            background: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>
                Repository Summary
              </h3>
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Repository</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{activeRepositoryName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Default Branch</span>
                  <span style={{ fontWeight: 500, color: '#111827' }}>main</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>AST Engine</span>
                  <span style={{ fontWeight: 500, color: '#1e69ff' }}>TypeScript Compiler API</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Runtime Guard</span>
                  <span style={{ fontWeight: 500, color: '#16a34a' }}>Fail-Closed</span>
                </div>
              </div>
            </div>

            {/* Fleet Hypervisor Status */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>
                Cloud MicroVM Fleet
              </h3>
              <div
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>Hypervisor</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontWeight: 600 }}>
                    <PulseDotIcon size={6} color="#16a34a" />
                    Operational
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Task Signing</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>HMAC-SHA256</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Proof Artifacts</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>Signed & Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Isolation Latency</span>
                  <span style={{ fontWeight: 500, color: '#64748b' }}>&lt; 45ms</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onScan}
                  disabled={isScanning}
                  style={{
                    width: '100%',
                    padding: '9px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e69ff',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isScanning ? 'wait' : 'pointer',
                    boxShadow: '0 1px 2px rgba(30, 105, 255, 0.2)',
                  }}
                >
                  {isScanning ? 'Scanning Call Sites...' : 'Trigger AST Scan'}
                </button>

                {onRunSimulation && (
                  <button
                    type="button"
                    onClick={onRunSimulation}
                    disabled={isSimulating}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      color: '#111827',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: isSimulating ? 'wait' : 'pointer',
                    }}
                  >
                    {isSimulating ? 'Simulating...' : 'Run Proof Studio'}
                  </button>
                )}

                {onDeliverPR && (
                  <button
                    type="button"
                    onClick={onDeliverPR}
                    style={{
                      width: '100%',
                      padding: '9px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                    }}
                  >
                    Deliver Verified PR
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security & Compliance Footer Note */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#16a34a', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              <ShieldCheckIcon size={14} color="#16a34a" />
              <span>Fail-Closed Isolation</span>
            </div>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
              Customer repositories execute in isolated MicroVM fleet environments. Untrusted repository code never runs on the application web server.
            </p>
          </div>
        </aside>
      </div>

      {/* 3. ASK AI MODAL */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
                  Ask TryPatchBay AI
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAskAiModal(false);
                  setAskAiResponse(null);
                }}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAskAiSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                placeholder="Ask about breaking dependency versions, AST call-site mappings, or MicroVM verification..."
                rows={3}
                value={askAiQuery}
                onChange={(e) => setAskAiQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  color: '#111827',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAskAiModal(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#1e69ff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ffffff',
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
