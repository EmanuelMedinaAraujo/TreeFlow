import React from 'react';
import { GrowthDirection, TreeData } from '../types/tree';
import { 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  ChevronsDown, 
  ChevronsUp, 
  Plus, 
  FolderTree, 
  HelpCircle,
  CheckCircle2,
  GitFork
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  tree: TreeData;
  zoom: number;
  onUpdateZoom: (zoom: number) => void;
  onChangeGrowthDirection: (dir: GrowthDirection) => void;
  onFormatTree: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onAddRootNode: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  tree,
  zoom,
  onUpdateZoom,
  onChangeGrowthDirection,
  onFormatTree,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  onExpandAll,
  onCollapseAll,
  onAddRootNode,
}) => {
  if (!isOpen) return null;

  const questionCount = tree.nodes.filter(n => n.type !== 'outcome').length;
  const outcomeCount = tree.nodes.filter(n => n.type === 'outcome').length;

  return (
    <aside 
      id="high-density-sidebar"
      className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col p-4 gap-5 shrink-0 overflow-y-auto select-none z-30 transition-all text-slate-800"
    >
      {/* 1. LAYOUT CONFIGURATION */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">
          Layout Configuration
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-600 mb-1.5 block font-medium">
              Growth Direction
            </label>
            <div className="grid grid-cols-3 gap-1">
              {/* Top to Bottom */}
              <button
                id="sidebar-dir-tb"
                onClick={() => onChangeGrowthDirection('TB')}
                className={`p-2 border rounded flex flex-col items-center gap-1 transition-all ${
                  tree.growthDirection === 'TB'
                    ? 'border-2 border-blue-500 rounded bg-blue-50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
                title="Tree grows from Top to Bottom"
              >
                <div className="w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400" />
                <span className={`text-[9px] ${tree.growthDirection === 'TB' ? 'font-semibold text-blue-600' : 'text-slate-600'}`}>
                  Top
                </span>
              </button>

              {/* Left to Right */}
              <button
                id="sidebar-dir-lr"
                onClick={() => onChangeGrowthDirection('LR')}
                className={`p-2 border rounded flex flex-col items-center gap-1 transition-all ${
                  tree.growthDirection === 'LR'
                    ? 'border-2 border-blue-500 rounded bg-blue-50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
                title="Tree grows from Left to Right"
              >
                <div className="w-3.5 h-3.5 border-r-2 border-b-2 border-slate-400" />
                <span className={`text-[9px] ${tree.growthDirection === 'LR' ? 'font-semibold text-blue-600' : 'text-slate-600'}`}>
                  Right
                </span>
              </button>

              {/* Right to Left */}
              <button
                id="sidebar-dir-rl"
                onClick={() => onChangeGrowthDirection('RL')}
                className={`p-2 border rounded flex flex-col items-center gap-1 transition-all ${
                  tree.growthDirection === 'RL'
                    ? 'border-2 border-blue-500 rounded bg-blue-50 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-400'
                }`}
                title="Tree grows from Right to Left"
              >
                <div className="w-3.5 h-3.5 border-l-2 border-b-2 border-slate-400" />
                <span className={`text-[9px] ${tree.growthDirection === 'RL' ? 'font-semibold text-blue-600' : 'text-slate-600'}`}>
                  Left
                </span>
              </button>
            </div>
          </div>

          <button
            id="sidebar-format-btn"
            onClick={onFormatTree}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs rounded font-medium flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>Auto-Format Tree</span>
          </button>
        </div>
      </div>

      {/* 2. CANVAS VIEW */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">
          Canvas View
        </h3>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center bg-white p-2 border border-slate-200 rounded">
            <span className="text-xs text-slate-600 font-medium">Zoom Level</span>
            <span className="text-xs font-mono font-bold text-slate-800">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="250"
            value={Math.round(zoom * 100)}
            onChange={(e) => onUpdateZoom(Number(e.target.value) / 100)}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
          />

          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={onZoomOut}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 flex items-center justify-center transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomIn}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 flex items-center justify-center transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onZoomReset}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700 transition-colors"
              title="Reset Zoom to 100%"
            >
              100%
            </button>
            <button
              onClick={onZoomFit}
              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-600 flex items-center justify-center transition-colors"
              title="Fit to Screen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. TREE METRICS & ACTIONS */}
      <div>
        <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-3">
          Tree Metrics
        </h3>
        <div className="bg-white border border-slate-200 rounded p-2.5 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3 h-3 text-blue-500" />
              <span>Questions</span>
            </span>
            <span className="font-mono font-bold text-slate-800">{questionCount}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Terminal Outcomes</span>
            </span>
            <span className="font-mono font-bold text-slate-800">{outcomeCount}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <GitFork className="w-3 h-3 text-indigo-500" />
              <span>Answer Links</span>
            </span>
            <span className="font-mono font-bold text-slate-800">{tree.edges.length}</span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex gap-1.5">
            <button
              onClick={onExpandAll}
              className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
            >
              <ChevronsDown className="w-3 h-3" />
              <span>Expand</span>
            </button>
            <button
              onClick={onCollapseAll}
              className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium rounded flex items-center justify-center gap-1 transition-colors"
            >
              <ChevronsUp className="w-3 h-3" />
              <span>Collapse</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM TIP BANNER */}
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="bg-blue-50 border border-blue-100 rounded p-3">
          <p className="text-[10px] text-blue-700 leading-relaxed">
            <span className="font-bold uppercase">Tip:</span> Right-click anywhere on the canvas to insert a new question node.
          </p>
        </div>
      </div>
    </aside>
  );
};
