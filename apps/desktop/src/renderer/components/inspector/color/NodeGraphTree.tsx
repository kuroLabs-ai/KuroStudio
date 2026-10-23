import React from 'react';
import {
  Layers,
  Power,
  RotateCcw,
  Sliders,
  TrendingUp,
  Film,
  Sparkles,
  Plus,
  Play
} from 'lucide-react';

export interface NodeItem {
  id: string;
  number: string;
  name: string;
  category: 'primaries' | 'curves' | 'lut' | 'fx' | 'custom';
  enabled: boolean;
  active: boolean;
}

interface NodeGraphTreeProps {
  nodes: NodeItem[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  onToggleNodeBypass: (nodeId: string) => void;
  onResetNode: (nodeId: string) => void;
  onAddNode: () => void;
}

export const NodeGraphTree: React.FC<NodeGraphTreeProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onToggleNodeBypass,
  onResetNode,
  onAddNode,
}) => {
  const getNodeIcon = (cat: NodeItem['category']) => {
    switch (cat) {
      case 'primaries':
        return <Sliders className="w-3.5 h-3.5 text-emerald-400" />;
      case 'curves':
        return <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />;
      case 'lut':
        return <Film className="w-3.5 h-3.5 text-amber-400" />;
      case 'fx':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3 select-none">
      {/* Node Tree Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[var(--kuro-text-primary)]">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Resolve Node Tree Graph</span>
        </div>
        <button
          onClick={onAddNode}
          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[10px] text-white font-medium transition cursor-pointer"
        >
          <Plus className="w-2.5 h-2.5" />
          Add Serial Node
        </button>
      </div>

      {/* Visual Canvas with Flow Diagram */}
      <div className="relative bg-[#0d0d10] p-4 rounded border border-white/10 shadow-inner overflow-x-auto no-scrollbar">
        {/* Background Grid Pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />

        <div className="relative flex items-center justify-between min-w-[320px] gap-2">
          {/* Source Input Socket */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300">
              <Play className="w-3 h-3 fill-current ml-0.5" />
            </div>
            <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">IN</span>
          </div>

          {/* Connection Wire */}
          <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500/50 to-white/20 min-w-[12px]" />

          {/* Sequence of Nodes */}
          {nodes.map((node, idx) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => onSelectNode(node.id)}
                  className={`relative p-2.5 rounded-lg border flex flex-col justify-between gap-1.5 cursor-pointer transition-all duration-150 shrink-0 w-28 ${
                    isSelected
                      ? 'bg-[var(--kuro-bg-hover)] border-white shadow-lg ring-1 ring-white/20'
                      : 'bg-[var(--kuro-bg-panel)] border-white/15 hover:border-white/40'
                  }`}
                >
                  {/* Top Bar: Number & Status LED */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-white bg-black/40 px-1 rounded">
                      {node.number}
                    </span>
                    <div className="flex items-center gap-1">
                      {/* Active/Bypass LED */}
                      <span
                        className={`w-2 h-2 rounded-full transition-colors ${
                          node.enabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                        }`}
                        title={node.enabled ? 'Node Active' : 'Node Bypassed'}
                      />
                      {/* Bypass Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleNodeBypass(node.id);
                        }}
                        className={`p-0.5 rounded transition ${
                          node.enabled
                            ? 'text-[var(--kuro-text-muted)] hover:text-white'
                            : 'text-amber-400 hover:text-amber-300'
                        }`}
                        title={node.enabled ? 'Mute / Bypass Node' : 'Unmute Node'}
                      >
                        <Power className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Node Thumbnail Icon & Name */}
                  <div className="flex items-center gap-1.5 py-1">
                    {getNodeIcon(node.category)}
                    <span className="font-semibold text-white text-[10px] truncate">{node.name}</span>
                  </div>

                  {/* Reset Node Action */}
                  <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[9px] text-[var(--kuro-text-muted)]">
                    <span className="uppercase font-mono">{node.enabled ? 'Active' : 'Muted'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetNode(node.id);
                      }}
                      className="hover:text-white p-0.5 rounded transition"
                      title="Reset this node"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Connecting Wire to next node or output */}
                {idx < nodes.length - 1 && (
                  <div className="h-0.5 w-3 bg-white/20 shrink-0" />
                )}
              </React.Fragment>
            );
          })}

          {/* Connection Wire */}
          <div className="h-0.5 flex-1 bg-gradient-to-r from-white/20 to-cyan-500/50 min-w-[12px]" />

          {/* Output Socket */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-6 h-6 rounded bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-300">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase">OUT</span>
          </div>
        </div>
      </div>

      <p className="text-[9px] text-[var(--kuro-text-muted)] font-mono text-center">
        Click any node to edit its parameters · Toggle power button to bypass grade stage
      </p>
    </div>
  );
};
