import React, { useState } from 'react';
import { TreeNode, TreeEdge, GrowthDirection } from '../types/tree';
import { calculateEdgePath } from '../utils/treeUtils';
import { Edit2, Trash2 } from 'lucide-react';

interface TreeEdgeProps {
  edge: TreeEdge;
  sourceNode: TreeNode;
  targetNode: TreeNode;
  growthDirection: GrowthDirection;
  isSelected: boolean;
  onSelect: (edgeId: string, e: React.MouseEvent) => void;
  onEditAnswer: (edge: TreeEdge) => void;
  onDeleteEdge: (edgeId: string) => void;
  onContextMenu: (e: React.MouseEvent, edgeId: string) => void;
}

export const TreeEdgeComponent: React.FC<TreeEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  growthDirection,
  isSelected,
  onSelect,
  onEditAnswer,
  onDeleteEdge,
  onContextMenu,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const { path, labelX, labelY } = calculateEdgePath(
    sourceNode,
    targetNode,
    growthDirection
  );

  return (
    <g
      id={`edge-group-${edge.id}`}
      className="group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(edge.id, e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, edge.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Invisible thicker hit-test stroke for effortless clicking */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        strokeLinecap="round"
      />

      {/* Visible High-Density Edge Path Line */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? '#2563eb' : isHovered ? '#475569' : '#94a3b8'}
        strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
        strokeDasharray={isSelected ? '4 2' : 'none'}
        markerEnd={isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
        className="transition-all duration-150"
      />

      {/* High Density Answer Badge */}
      <foreignObject
        x={labelX - 100}
        y={labelY - 14}
        width={200}
        height={28}
        className="overflow-visible pointer-events-none"
      >
        <div className="flex items-center justify-center w-full h-full">
          <div
            id={`edge-badge-${edge.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(edge.id, e);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditAnswer(edge);
            }}
            className={`pointer-events-auto select-none px-2 py-0.5 rounded shadow-xs flex items-center gap-1.5 transition-all text-xs border ${
              isSelected
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/30'
                : isHovered
                ? 'bg-white border-slate-400 text-slate-900 shadow-sm'
                : 'bg-white border-slate-300 text-slate-800'
            }`}
            title="Double-click to edit branch answer"
          >
            {/* Condition prefix */}
            <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
              IF
            </span>

            {/* Answer Text */}
            <span className={`font-mono text-[10px] font-bold max-w-[130px] truncate ${isSelected ? 'text-white' : 'text-blue-600'}`}>
              "{edge.answer || 'Default'}"
            </span>

            {/* Quick Actions on Hover */}
            {isHovered && !isSelected && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAnswer(edge);
                  }}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="Edit Answer"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEdge(edge.id);
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete Link"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
