import React, { useState } from 'react';
import { TreeNode, GrowthDirection, TreeEdge } from '../types/tree';
import { 
  Plus, 
  Copy, 
  Trash2, 
  Edit3, 
  ChevronRight,
} from 'lucide-react';
import { getDescendantNodeIds, getNodeRole } from '../utils/treeUtils';

interface TreeNodeProps {
  node: TreeNode;
  growthDirection: GrowthDirection;
  isSelected: boolean;
  isMultiSelected?: boolean;
  edges: TreeEdge[];
  isHighlighted?: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onStartDrag: (id: string, e: React.MouseEvent) => void;
  onStartConnection: (sourceId: string, e: React.MouseEvent) => void;
  onToggleCollapse: (id: string) => void;
  onEdit: (node: TreeNode) => void;
  onDelete: (id: string) => void;
  onCopySubtree: (id: string) => void;
  onQuickAddChild: (sourceId: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
}

export const TreeNodeComponent: React.FC<TreeNodeProps> = ({
  node,
  growthDirection,
  isSelected,
  isMultiSelected,
  edges,
  isHighlighted,
  onSelect,
  onStartDrag,
  onStartConnection,
  onToggleCollapse,
  onEdit,
  onDelete,
  onCopySubtree,
  onQuickAddChild,
  onContextMenu,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const childEdges = edges.filter(e => e.sourceNodeId === node.id);
  const hasChildren = childEdges.length > 0;
  const descendantCount = hasChildren ? getDescendantNodeIds(node.id, edges).size : 0;

  // Determine node role purely from connectivity
  const role = getNodeRole(node.id, edges);
  const displayId = `NODE_${node.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()}`;

  // If node is collapsed, show technical collapsed card
  if (node.isCollapsed && hasChildren) {
    return (
      <div
        id={`node-${node.id}`}
        className="absolute select-none cursor-pointer w-48 bg-white border border-slate-300 shadow-md rounded-md p-2.5 opacity-90 hover:opacity-100 transition-all hover:border-slate-400 z-10"
        style={{
          left: `${node.x}px`,
          top: `${node.y}px`,
        }}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          if ((e.target as HTMLElement).closest('.nodrag')) return;
          e.stopPropagation();
          onStartDrag(node.id, e);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onToggleCollapse(node.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, node.id);
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-mono text-slate-500 font-semibold">
            {role === 'root' ? 'ROOT' : displayId}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
            className="nodrag text-[9px] text-blue-600 hover:underline font-semibold"
          >
            Expand
          </button>
        </div>
        <p className="text-[10px] text-slate-700 font-medium line-clamp-1">
          {node.question}
        </p>
        <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
          <ChevronRight className="w-3 h-3 text-blue-500 inline" />
          <span>{descendantCount} child node{descendantCount > 1 ? 's' : ''} hidden</span>
        </p>
      </div>
    );
  }

  // Header background and accent styling based on dynamic role
  const headerBgClass = isSelected
    ? 'bg-blue-600 text-white'
    : role === 'outcome'
    ? 'bg-emerald-800 text-white'
    : role === 'root'
    ? 'bg-slate-900 text-white'
    : 'bg-slate-800 text-white';

  const dotColorClass = isSelected
    ? 'bg-blue-200'
    : role === 'outcome'
    ? 'bg-emerald-400'
    : role === 'root'
    ? 'bg-amber-400'
    : 'bg-blue-400';

  const roleLabel = role === 'root'
    ? 'ROOT'
    : role === 'outcome'
    ? 'OUTCOME'
    : role === 'branch'
    ? `BRANCH (${childEdges.length})`
    : displayId;

  return (
    <div
      id={`node-${node.id}`}
      className={`absolute select-none cursor-move transition-all duration-100 group rounded-lg overflow-hidden bg-white shadow-md ${
        isSelected
          ? 'border-2 border-blue-500 shadow-xl ring-4 ring-blue-500/20 z-30'
          : isMultiSelected
          ? 'border-2 border-blue-400 shadow-lg ring-2 ring-blue-400/20 z-25'
          : isHighlighted
          ? 'border-2 border-amber-500 shadow-lg ring-2 ring-amber-400/20 z-20'
          : role === 'outcome'
          ? 'border-2 border-emerald-600 hover:border-emerald-700 z-10'
          : 'border-2 border-slate-700 hover:border-slate-900 z-10'
      }`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width || 220}px`,
        minHeight: `${node.height || 110}px`,
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.nodrag')) return;
        e.stopPropagation();
        onStartDrag(node.id, e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id, e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, node.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* High Density Card Header Bar */}
      <div className={`${headerBgClass} px-3 py-1 flex justify-between items-center transition-colors`}>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
          <span className="text-[9px] font-mono tracking-wider font-semibold opacity-95">
            {roleLabel}
          </span>
        </div>

        {/* Quick action buttons in header on hover or selected */}
        <div className={`nodrag flex items-center gap-1 transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
          <button
            id={`edit-btn-${node.id}`}
            title="Edit Node (Double click)"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            className="p-0.5 text-slate-300 hover:text-white rounded transition-colors"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            id={`copy-btn-${node.id}`}
            title="Copy (Ctrl+C)"
            onClick={(e) => {
              e.stopPropagation();
              onCopySubtree(node.id);
            }}
            className="p-0.5 text-slate-300 hover:text-white rounded transition-colors"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            id={`delete-btn-${node.id}`}
            title="Delete Node"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-0.5 text-slate-300 hover:text-red-300 rounded transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* High Density Card Body */}
      <div className="p-3 flex flex-col justify-between min-h-[76px]">
        <div>
          {/* Question / Outcome text */}
          <p 
            className="text-[11px] font-semibold text-slate-800 leading-snug tracking-tight line-clamp-3 mb-1 cursor-text select-text"
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEdit(node);
            }}
            title={node.question}
          >
            {node.question || <span className="text-slate-400 italic">Empty Node</span>}
          </p>

          {/* Optional Subtext / Note */}
          {node.description && (
            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-2 select-text">
              {node.description}
            </p>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
          {hasChildren ? (
            <button
              id={`collapse-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(node.id);
              }}
              className="nodrag flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded transition-colors"
              title="Collapse subtree"
            >
              Collapse
            </button>
          ) : (
            <button
              id={`edit-node-btn-${node.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
              className="nodrag flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded transition-colors"
            >
              Edit
            </button>
          )}

          <button
            id={`add-branch-btn-${node.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAddChild(node.id);
            }}
            className="nodrag flex-1 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-medium rounded transition-colors flex items-center justify-center gap-0.5"
            title="Add connected branch option"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Branch</span>
          </button>
        </div>
      </div>

      {/* Outgoing Connection Handle Port */}
      <div
        id={`out-port-${node.id}`}
        className={`nodrag absolute flex items-center justify-center cursor-crosshair group-hover:scale-110 transition-transform ${
          growthDirection === 'TB'
            ? '-bottom-2.5 left-1/2 -translate-x-1/2'
            : growthDirection === 'LR'
            ? '-right-2.5 top-1/2 -translate-y-1/2'
            : '-left-2.5 top-1/2 -translate-y-1/2'
        }`}
        title="Drag connection to another node (or to empty canvas to create new connected branch)"
        onMouseDown={(e) => {
          e.stopPropagation();
          onStartConnection(node.id, e);
        }}
      >
        <div className="w-5 h-5 rounded-full bg-white border-2 border-blue-500 shadow-xs flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </div>
      </div>

      {/* Target Incoming Indicator */}
      <div
        id={`in-port-${node.id}`}
        className={`absolute pointer-events-none rounded-full w-2.5 h-2.5 bg-slate-400 border border-white shadow-xs ${
          growthDirection === 'TB'
            ? '-top-1 left-1/2 -translate-x-1/2'
            : growthDirection === 'LR'
            ? '-left-1 top-1/2 -translate-y-1/2'
            : '-right-1 top-1/2 -translate-y-1/2'
        }`}
      />
    </div>
  );
};

