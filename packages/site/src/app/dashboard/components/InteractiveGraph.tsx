'use client';

import React, { useState, useMemo, useRef } from 'react';
import type { DependencyGraph } from '@patchversion/shared';
import {
  SearchIcon,
  TopologyIcon,
  AlertTriangleIcon,
} from '@/app/components/UiIcons';
import type { FindingInfo } from './TriageCard';

interface InteractiveGraphProps {
  graph: DependencyGraph;
  repoFullName: string;
  onSelectPackage?: (packageName: string) => void;
  selectedPackage?: string | null;
  findings?: FindingInfo[];
}

export function InteractiveGraph({
  graph,
  repoFullName,
  onSelectPackage,
  selectedPackage,
  findings = [],
}: InteractiveGraphProps) {
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [filterScope, setFilterScope] = useState<'all' | 'direct' | 'transitive'>('all');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(selectedPackage || null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map package names with breaking changes / findings
  const affectedPkgMap = useMemo(() => {
    const map = new Map<string, FindingInfo>();
    findings.forEach(f => {
      if (f.isBreaking) {
        map.set(f.packageName.toLowerCase(), f);
      }
    });
    return map;
  }, [findings]);

  // Separate direct vs transitive nodes
  const directNodes = useMemo(
    () => graph.nodes.filter(n => n.direct || n.type === 'workspace'),
    [graph.nodes]
  );
  const transitiveNodes = useMemo(
    () => graph.nodes.filter(n => !n.direct && n.type !== 'workspace'),
    [graph.nodes]
  );

  // Compute clean layout coordinates for direct nodes and clusters
  const layout = useMemo(() => {
    const width = 1100;
    const height = 620;
    const centerX = width / 2;
    const centerY = height / 2;

    const coords = new Map<
      string,
      {
        x: number;
        y: number;
        r: number;
        color: string;
        label: string;
        isAffected: boolean;
        isDirect: boolean;
      }
    >();

    // 1. Center root node
    const rootName = repoFullName.split('/')[1] || repoFullName;
    coords.set('root', {
      x: centerX,
      y: centerY,
      r: 34,
      color: '#141a39',
      label: rootName,
      isAffected: false,
      isDirect: true,
    });

    // 2. Direct dependencies positioned in an ellipse around root
    const directCount = Math.max(directNodes.length, 1);
    const radiusX = 350;
    const radiusY = 220;

    directNodes.forEach((node, idx) => {
      const angle = (idx / directCount) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      const isDev =
        node.name.startsWith('@types/') ||
        node.role === 'build-tool' ||
        node.role === 'testing';
      const isAffected = affectedPkgMap.has(node.name.toLowerCase());

      coords.set(node.id, {
        x,
        y,
        r: isAffected ? 24 : 20,
        color: isAffected ? '#ea580c' : isDev ? '#3730a3' : '#141a39',
        label: node.name,
        isAffected,
        isDirect: true,
      });
    });

    // 3. Cluster transitive nodes near their parent edges (sample up to 130 for fast SVG rendering)
    const sampledTransitives = transitiveNodes.slice(0, 130);
    sampledTransitives.forEach((node, idx) => {
      const edge = graph.edges.find(
        e => e.target === node.id || e.source === node.id
      );
      const parentCoord = edge
        ? coords.get(edge.source) || coords.get(edge.target)
        : null;
      const baseAngle = (idx / sampledTransitives.length) * 2 * Math.PI;
      const outerRadius = 450;
      const x = parentCoord
        ? parentCoord.x + (Math.cos(baseAngle) * 55 + (idx % 5) * 8)
        : centerX + outerRadius * Math.cos(baseAngle);
      const y = parentCoord
        ? parentCoord.y + (Math.sin(baseAngle) * 45 + (idx % 4) * 8)
        : centerY + (outerRadius - 60) * Math.sin(baseAngle);

      const isAffected = affectedPkgMap.has(node.name.toLowerCase());

      coords.set(node.id, {
        x,
        y,
        r: isAffected ? 10 : 8,
        color: isAffected ? '#ea580c' : '#94a3b8',
        label: node.name,
        isAffected,
        isDirect: false,
      });
    });

    return { width, height, centerX, centerY, coords };
  }, [graph, directNodes, transitiveNodes, repoFullName, affectedPkgMap]);

  // Handle Pan Interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(z => Math.min(Number((z + 0.2).toFixed(2)), 2.5));
  const handleZoomOut = () => setZoom(z => Math.max(Number((z - 0.2).toFixed(2)), 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Find active node object
  const activeNode = graph.nodes.find(
    n => n.id === activeNodeId || n.name === activeNodeId
  );
  const activeFinding = activeNode
    ? affectedPkgMap.get(activeNode.name.toLowerCase())
    : null;

  // Filter visibility
  const isNodeVisible = (nodeId: string, isDirect: boolean) => {
    if (filterScope === 'direct' && !isDirect) return false;
    if (filterScope === 'transitive' && isDirect) return false;
    return true;
  };

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #dfe1ef',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(20, 26, 57, 0.03)',
      }}
    >
      {/* Top Graph HUD Toolbar */}
      <div
        style={{
          padding: '12px 18px',
          background: '#f7f7fc',
          borderBottom: '1px solid #dfe1ef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#efeff9',
              color: '#141a39',
            }}
          >
            <TopologyIcon size={16} />
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#141a39' }}>
            Interactive Dependency Graph
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              padding: '2px 8px',
              borderRadius: '999px',
              background: '#e4e5f4',
              color: '#141a39',
              fontWeight: 600,
            }}
          >
            {graph.nodes.length} Nodes · {graph.edges.length} Edges
          </span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            ({directNodes.length} Direct, {transitiveNodes.length} Transitive)
          </span>
        </div>

        {/* Scope Filters, Search & Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Scope Filters */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#ffffff',
              border: '1px solid #dfe1ef',
              borderRadius: '999px',
              padding: '2px',
            }}
          >
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'direct', label: `Direct (${directNodes.length})` },
                { id: 'transitive', label: `Transitive (${transitiveNodes.length})` },
              ] as const
            ).map(tab => {
              const isSelected = filterScope === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterScope(tab.id)}
                  style={{
                    background: isSelected ? '#141a39' : 'transparent',
                    color: isSelected ? '#ffffff' : '#4e5471',
                    border: 'none',
                    borderRadius: '999px',
                    padding: '3px 9px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Node Search Bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '10px', color: '#64748b', display: 'flex' }}>
              <SearchIcon size={12} />
            </span>
            <input
              type="text"
              placeholder="Find package node..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{
                padding: '5px 10px 5px 28px',
                fontSize: '12px',
                border: '1px solid #dfe1ef',
                borderRadius: '999px',
                width: '180px',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: '#efeff9',
              padding: '2px',
              borderRadius: '999px',
              border: '1px solid #dfe1ef',
            }}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                background: 'none',
                border: 'none',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#141a39',
                cursor: 'pointer',
              }}
              title="Zoom In"
            >
              +
            </button>
            <span style={{ fontSize: '11px', padding: '3px 4px', color: '#64748b', fontWeight: 600 }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                background: 'none',
                border: 'none',
                padding: '3px 8px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#141a39',
                cursor: 'pointer',
              }}
              title="Zoom Out"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: '#ffffff',
                border: '1px solid #dfe1ef',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#141a39',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Graph Canvas */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'relative',
          height: '540px',
          background: 'radial-gradient(#dfe1ef 1px, #f7f7fc 1px)',
          backgroundSize: '20px 20px',
          cursor: isDragging ? 'grabbing' : 'grab',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {/* Edges from Root to Direct Nodes */}
          {directNodes.map(node => {
            const nodeCoord = layout.coords.get(node.id);
            if (!nodeCoord) return null;
            if (!isNodeVisible(node.id, true)) return null;

            const isMatch =
              filterQuery &&
              node.name.toLowerCase().includes(filterQuery.toLowerCase());
            const isAffected = nodeCoord.isAffected;

            return (
              <line
                key={`edge-root-${node.id}`}
                x1={layout.centerX}
                y1={layout.centerY}
                x2={nodeCoord.x}
                y2={nodeCoord.y}
                stroke={isAffected ? '#ea580c' : isMatch ? '#3b82f6' : '#cfd1e8'}
                strokeWidth={isAffected ? 2.5 : isMatch ? 2.5 : 1.2}
                strokeDasharray={node.direct ? 'none' : '3 3'}
              />
            );
          })}

          {/* Sampled Transitive Edges */}
          {graph.edges.slice(0, 100).map((edge, idx) => {
            const src = layout.coords.get(edge.source);
            const tgt = layout.coords.get(edge.target);
            if (!src || !tgt) return null;
            if (!isNodeVisible(edge.source, src.isDirect) || !isNodeVisible(edge.target, tgt.isDirect)) {
              return null;
            }

            return (
              <line
                key={`sub-edge-${idx}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="#e2e8f0"
                strokeWidth={0.8}
              />
            );
          })}

          {/* Root Node */}
          <g
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveNodeId('root')}
          >
            <circle
              cx={layout.centerX}
              cy={layout.centerY}
              r={34}
              fill="#141a39"
              stroke="#dfe1ef"
              strokeWidth={3}
            />
            <text
              x={layout.centerX}
              y={layout.centerY + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11px"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {layout.coords.get('root')?.label.slice(0, 10)}
            </text>
          </g>

          {/* Direct Nodes */}
          {directNodes.map(node => {
            const coord = layout.coords.get(node.id);
            if (!coord) return null;
            if (!isNodeVisible(node.id, true)) return null;

            const isSelected =
              activeNodeId === node.id || selectedPackage === node.name;
            const isMatch =
              filterQuery &&
              node.name.toLowerCase().includes(filterQuery.toLowerCase());
            const isAffected = coord.isAffected;

            return (
              <g
                key={node.id}
                onClick={e => {
                  e.stopPropagation();
                  setActiveNodeId(node.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isSelected ? coord.r + 5 : coord.r}
                  fill={
                    isAffected
                      ? '#fff7ed'
                      : isMatch
                      ? '#eff6ff'
                      : '#ffffff'
                  }
                  stroke={
                    isSelected
                      ? '#3b82f6'
                      : isAffected
                      ? '#ea580c'
                      : isMatch
                      ? '#2563eb'
                      : '#dfe1ef'
                  }
                  strokeWidth={isSelected ? 3 : isAffected ? 2.5 : 1.5}
                />
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={coord.r - 5}
                  fill={coord.color}
                  opacity={isAffected ? 0.2 : 0.15}
                />
                <text
                  x={coord.x}
                  y={coord.y + 4}
                  textAnchor="middle"
                  fill={isAffected ? '#9a3412' : '#141a39'}
                  fontSize="9px"
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {node.name.slice(0, 10)}
                </text>
                <text
                  x={coord.x}
                  y={coord.y + coord.r + 14}
                  textAnchor="middle"
                  fill="#4e5471"
                  fontSize="9px"
                  fontFamily="monospace"
                >
                  {node.version || ''}
                </text>
              </g>
            );
          })}

          {/* Sampled Transitive Nodes */}
          {transitiveNodes.slice(0, 100).map(node => {
            const coord = layout.coords.get(node.id);
            if (!coord) return null;
            if (!isNodeVisible(node.id, false)) return null;

            const isSelected = activeNodeId === node.id;
            const isMatch =
              filterQuery &&
              node.name.toLowerCase().includes(filterQuery.toLowerCase());

            return (
              <g
                key={node.id}
                onClick={e => {
                  e.stopPropagation();
                  setActiveNodeId(node.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isSelected ? coord.r + 3 : coord.r}
                  fill={isMatch ? '#2563eb' : '#cbd5e1'}
                  stroke={isSelected ? '#3b82f6' : '#ffffff'}
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </svg>

        {/* Selected Node Floating HUD Box */}
        {activeNode && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#ffffff',
              border: '1px solid #dfe1ef',
              borderRadius: '8px',
              padding: '14px 16px',
              maxWidth: '280px',
              boxShadow: '0 4px 16px rgba(20, 26, 57, 0.08)',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="small-label" style={{ fontSize: '9px' }}>INSPECTED NODE</span>
              <button
                type="button"
                onClick={() => setActiveNodeId(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>
            <strong style={{ display: 'block', fontSize: '13px', color: '#141a39', marginTop: '6px' }}>
              {activeNode.name}
            </strong>
            <div style={{ color: '#64748b', marginTop: '3px' }}>
              Version: <code>{activeNode.version || 'declared'}</code>
            </div>
            <div style={{ color: '#64748b', marginTop: '2px' }}>
              Type: <strong style={{ color: '#141a39' }}>{activeNode.type}</strong> ({activeNode.direct ? 'Direct' : 'Transitive'})
            </div>
            {activeNode.role && (
              <div style={{ color: '#64748b', marginTop: '2px' }}>
                Role: <strong>{activeNode.role}</strong>
              </div>
            )}

            {activeFinding && (
              <div
                style={{
                  marginTop: '10px',
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: '6px',
                  padding: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#9a3412', fontWeight: 700 }}>
                  <AlertTriangleIcon size={12} color="#ea580c" />
                  <span>Breaking Drift Detected</span>
                </div>
                <div style={{ color: '#7c2d12', fontSize: '10px', marginTop: '2px' }}>
                  Target version: <code>v{activeFinding.toVersion}</code>
                </div>
              </div>
            )}

            <button
              type="button"
              className="pill-button pill-button-dark"
              onClick={() => onSelectPackage?.(activeNode.name)}
              style={{ marginTop: '10px', fontSize: '10px', minHeight: '28px', padding: '0 10px', width: '100%' }}
            >
              Filter in Triage Deck →
            </button>
          </div>
        )}

        {/* Legend Overlay at Bottom-Left */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            border: '1px solid #dfe1ef',
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            gap: '12px',
            fontSize: '10px',
            color: '#4e5471',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#141a39' }} />
            Root Repo
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3730a3' }} />
            Direct Dependency
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }} />
            Transitive (Sub-dependency)
          </span>
          {affectedPkgMap.size > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ea580c' }} />
              Breaking Upgrade
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
