import React from 'react';
import { TreeNode, TreeEdge, ViewTransform } from '../types/tree';
import { MapPin, EyeOff } from 'lucide-react';
import { getNodeRole } from '../utils/treeUtils';

interface MinimapProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  hiddenNodeIds: Set<string>;
  transform: ViewTransform;
  containerWidth: number;
  containerHeight: number;
  onNavigateTo: (worldX: number, worldY: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  edges,
  hiddenNodeIds,
  transform,
  containerWidth,
  containerHeight,
  onNavigateTo,
  isOpen,
  onToggle,
}) => {
  const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));

  if (!isOpen) {
    return (
      <button
        id="toggle-minimap-btn"
        onClick={onToggle}
        className="p-1.5 bg-white border border-slate-200 rounded shadow-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        title="Show Minimap Overview"
      >
        <MapPin className="w-3.5 h-3.5 text-blue-500" />
        <span>Map</span>
      </button>
    );
  }

  // Calculate world bounds of nodes
  let minX = 0;
  let maxX = 1000;
  let minY = 0;
  let maxY = 800;

  if (visibleNodes.length > 0) {
    minX = Math.min(...visibleNodes.map(n => n.x)) - 200;
    maxX = Math.max(...visibleNodes.map(n => n.x + (n.width || 220))) + 200;
    minY = Math.min(...visibleNodes.map(n => n.y)) - 200;
    maxY = Math.max(...visibleNodes.map(n => n.y + (n.height || 110))) + 200;
  }

  const mapWidth = 180;
  const mapHeight = 120;

  const worldWidth = Math.max(800, maxX - minX);
  const worldHeight = Math.max(600, maxY - minY);

  const scaleX = mapWidth / worldWidth;
  const scaleY = mapHeight / worldHeight;
  const scale = Math.min(scaleX, scaleY);

  // Viewport rectangle in world coordinates
  const viewportWorldLeft = -transform.x / transform.zoom;
  const viewportWorldTop = -transform.y / transform.zoom;
  const viewportWorldWidth = containerWidth / transform.zoom;
  const viewportWorldHeight = containerHeight / transform.zoom;

  // Convert to minimap pixel space
  const vpMapLeft = (viewportWorldLeft - minX) * scale;
  const vpMapTop = (viewportWorldTop - minY) * scale;
  const vpMapWidth = viewportWorldWidth * scale;
  const vpMapHeight = viewportWorldHeight * scale;

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickMapX = e.clientX - rect.left;
    const clickMapY = e.clientY - rect.top;

    const targetWorldX = minX + clickMapX / scale;
    const targetWorldY = minY + clickMapY / scale;

    onNavigateTo(targetWorldX, targetWorldY);
  };

  return (
    <div 
      id="minimap-container"
      className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg shadow-xl p-2 flex flex-col gap-1 select-none"
    >
      <div className="flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span className="flex items-center gap-1 font-mono">
          <span>Overview</span>
        </span>
        <button
          onClick={onToggle}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
          title="Hide Minimap"
        >
          <EyeOff className="w-3 h-3" />
        </button>
      </div>

      <div
        className="relative bg-slate-100 border border-slate-200 rounded overflow-hidden cursor-crosshair"
        style={{ width: `${mapWidth}px`, height: `${mapHeight}px` }}
        onClick={handleMinimapClick}
      >
        {/* Render simplified nodes */}
        {visibleNodes.map(node => {
          const nx = (node.x - minX) * scale;
          const ny = (node.y - minY) * scale;
          const nw = (node.width || 220) * scale;
          const nh = (node.height || 110) * scale;
          const isOutcome = getNodeRole(node.id, edges) === 'outcome';

          return (
            <div
              key={node.id}
              className="absolute rounded-xs"
              style={{
                left: `${nx}px`,
                top: `${ny}px`,
                width: `${Math.max(4, nw)}px`,
                height: `${Math.max(3, nh)}px`,
                backgroundColor: isOutcome ? '#10b981' : '#334155',
              }}
            />
          );
        })}

        {/* Viewport Box Indicator */}
        <div
          className="absolute border border-blue-500 bg-blue-500/15 pointer-events-none rounded-xs"
          style={{
            left: `${Math.max(0, vpMapLeft)}px`,
            top: `${Math.max(0, vpMapTop)}px`,
            width: `${Math.min(mapWidth, Math.max(12, vpMapWidth))}px`,
            height: `${Math.min(mapHeight, Math.max(8, vpMapHeight))}px`,
          }}
        />
      </div>
    </div>
  );
};
