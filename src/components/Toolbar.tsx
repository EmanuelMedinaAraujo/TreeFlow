import React from 'react';
import { GrowthDirection, TreeData } from '../types/tree';
import { 
  FolderTree, 
  Sparkles, 
  Play, 
  Download, 
  Upload, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  RotateCcw, 
  RotateCw, 
  Search, 
  ChevronsDown, 
  ChevronsUp,
  HelpCircle,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface ToolbarProps {
  tree: TreeData;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  searchQuery: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSearchChange: (q: string) => void;
  onUpdateTreeName: (name: string) => void;
  onChangeGrowthDirection: (dir: GrowthDirection) => void;
  onFormatTree: () => void;
  onAddRootNode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onZoomReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onOpenSimulator: () => void;
  onOpenShortcuts: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tree,
  zoom,
  canUndo,
  canRedo,
  searchQuery,
  isSidebarOpen,
  onToggleSidebar,
  onSearchChange,
  onUpdateTreeName,
  onChangeGrowthDirection,
  onFormatTree,
  onAddRootNode,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onZoomReset,
  onUndo,
  onRedo,
  onExpandAll,
  onCollapseAll,
  onOpenExport,
  onOpenImport,
  onOpenSimulator,
  onOpenShortcuts,
}) => {
  return (
    <nav 
      id="top-nav-bar"
      className="fixed top-0 left-0 right-0 z-40 h-12 bg-slate-900 text-white flex items-center justify-between px-4 border-b border-slate-700 select-none shadow-sm"
    >
      {/* LEFT SECTION: Sidebar Toggle, Brand Icon, Title & Stats */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title={isSidebarOpen ? 'Collapse layout panel' : 'Expand layout panel'}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-bold text-xs text-white shadow-xs">
            DT
          </div>
          <div className="flex items-baseline gap-2">
            <input
              id="tree-name-input"
              type="text"
              value={tree.name}
              onChange={(e) => onUpdateTreeName(e.target.value)}
              className="font-semibold text-sm tracking-tight text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-hidden px-1 py-0 max-w-[200px] transition-colors truncate"
              title="Click to rename decision tree"
            />
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              v2.4 • {tree.nodes.length} nodes
            </span>
          </div>
        </div>
      </div>

      {/* CENTER SECTION: Growth Direction & Format Layout */}
      <div className="hidden md:flex items-center gap-2">
        {/* Growth Direction Selector */}
        <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700/80">
          <button
            id="dir-btn-tb"
            onClick={() => onChangeGrowthDirection('TB')}
            className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 ${
              tree.growthDirection === 'TB'
                ? 'bg-slate-700 text-white font-medium shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tree grows Top to Bottom"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Top</span>
          </button>

          <button
            id="dir-btn-lr"
            onClick={() => onChangeGrowthDirection('LR')}
            className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 ${
              tree.growthDirection === 'LR'
                ? 'bg-slate-700 text-white font-medium shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tree grows Left to Right"
          >
            <ArrowRight className="w-3 h-3" />
            <span>Right</span>
          </button>

          <button
            id="dir-btn-rl"
            onClick={() => onChangeGrowthDirection('RL')}
            className={`px-2.5 py-1 text-xs rounded transition-all flex items-center gap-1 ${
              tree.growthDirection === 'RL'
                ? 'bg-slate-700 text-white font-medium shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tree grows Right to Left"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Left</span>
          </button>
        </div>

        {/* Auto-Format Tree Layout */}
        <button
          id="format-tree-btn"
          onClick={onFormatTree}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded text-xs font-medium transition-colors"
          title="Auto-format tree layout"
        >
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Format</span>
        </button>

        {/* Expand / Collapse All */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded p-0.5 border border-slate-700/80">
          <button
            id="expand-all-btn"
            onClick={onExpandAll}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Expand All Subtrees"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>
          <button
            id="collapse-all-btn"
            onClick={onCollapseAll}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
            title="Collapse All Subtrees"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RIGHT SECTION: Search, Simulator, Add Node, Export */}
      <div className="flex items-center gap-2">
        {/* Compact Search */}
        <div className="relative hidden lg:block">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-nodes-input"
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-36 pl-7 pr-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700/80 focus:bg-slate-800 rounded border border-slate-700 focus:border-blue-500 focus:outline-hidden text-white placeholder:text-slate-500 transition-all"
          />
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700/80">
          <button
            id="undo-btn"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="redo-btn"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add Question Node */}
        <button
          id="toolbar-add-node-btn"
          onClick={onAddRootNode}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded text-xs font-medium transition-colors"
          title="Add Question Node"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Add Node</span>
        </button>

        {/* Simulator Button */}
        <button
          id="toolbar-simulator-btn"
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors shadow-xs"
          title="Test decision tree step by step"
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="hidden sm:inline">Test Tree</span>
        </button>

        {/* Export Button */}
        <button
          id="toolbar-export-btn"
          onClick={onOpenExport}
          className="bg-blue-600 hover:bg-blue-500 text-xs px-3 py-1.5 rounded font-medium transition-colors text-white flex items-center gap-1.5 shadow-xs"
          title="Export tree as text file"
        >
          <Download className="w-3 h-3" />
          <span>Export .TXT</span>
        </button>

        {/* Import & Help */}
        <button
          id="toolbar-import-btn"
          onClick={onOpenImport}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Import or load sample templates"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        <button
          id="toolbar-shortcuts-btn"
          onClick={onOpenShortcuts}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Keyboard shortcuts & gestures"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
};
