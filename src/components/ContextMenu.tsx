import React, { useEffect, useRef } from 'react';
import { ContextMenuState, SubtreeClipboard, TreeNode } from '../types/tree';
import { 
  PlusCircle, 
  Copy, 
  ClipboardPaste, 
  Edit3, 
  Trash2, 
  Maximize, 
  ChevronRight, 
  Layers,
  FolderTree,
  GitFork,
  CheckSquare
} from 'lucide-react';

interface ContextMenuProps {
  state: ContextMenuState;
  clipboard: SubtreeClipboard | null;
  selectedNode: TreeNode | null;
  selectedNodeIds: Set<string>;
  onClose: () => void;
  onAddNode: (pos: { x: number; y: number }) => void;
  onPasteSubtree: (pos: { x: number; y: number }) => void;
  onEditNode: (nodeId: string) => void;
  onCopySubtree: (nodeId: string) => void;
  onCopySelectedNodes: () => void;
  onDuplicateSubtree: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onChangeNodeColor: (nodeId: string, color: string) => void;
  onDeleteNode: (nodeId: string, deleteDescendants: boolean) => void;
  onDeleteSelectedNodes: () => void;
  onAddChildBranch: (nodeId: string) => void;
  onEditEdgeAnswer: (edgeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onFormatTree: () => void;
  onZoomFit: () => void;
}

const COLOR_PRESETS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Slate', hex: '#475569' },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  state,
  clipboard,
  selectedNode,
  selectedNodeIds,
  onClose,
  onAddNode,
  onPasteSubtree,
  onEditNode,
  onCopySubtree,
  onCopySelectedNodes,
  onDuplicateSubtree,
  onToggleCollapse,
  onChangeNodeColor,
  onDeleteNode,
  onDeleteSelectedNodes,
  onAddChildBranch,
  onEditEdgeAnswer,
  onDeleteEdge,
  onFormatTree,
  onZoomFit,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!state.isOpen) return null;

  // Prevent context menu from clipping outside window
  const menuX = Math.min(state.x, window.innerWidth - 240);
  const menuY = Math.min(state.y, window.innerHeight - 380);

  const worldPos = state.worldPos || { x: 0, y: 0 };

  return (
    <div
      ref={menuRef}
      id="desktop-context-menu"
      className="fixed z-50 min-w-[220px] bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
      style={{ left: `${menuX}px`, top: `${menuY}px` }}
    >
      {/* ----------------- MULTI-NODE CONTEXT MENU ----------------- */}
      {(state.type === 'multi_node' || selectedNodeIds.size > 1) && (
        <>
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-blue-600" />
              <span>{selectedNodeIds.size} Nodes Selected</span>
            </span>
          </div>
          <div className="py-1">
            <button
              id="ctx-multi-copy"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 text-slate-800 font-medium transition-colors text-left"
              onClick={() => {
                onCopySelectedNodes();
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-blue-500" />
                <span>Copy Selected Nodes</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
            </button>
            <button
              id="ctx-multi-delete"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-red-50 text-red-600 font-medium transition-colors text-left"
              onClick={() => {
                onDeleteSelectedNodes();
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Delete Selected Nodes</span>
              </div>
              <span className="text-[10px] text-red-400 font-mono">Del</span>
            </button>
          </div>
        </>
      )}

      {/* ----------------- CANVAS CONTEXT MENU ----------------- */}
      {state.type === 'canvas' && (
        <>
          <div className="py-1">
            <button
              id="ctx-add-node"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors text-left"
              onClick={() => {
                onAddNode(worldPos);
                onClose();
              }}
            >
              <PlusCircle className="w-4 h-4 text-blue-500" />
              <span>Add Node Here</span>
            </button>
          </div>

          <div className="py-1">
            <button
              id="ctx-paste-subtree"
              disabled={!clipboard}
              className={`w-full flex items-center gap-2 px-3 py-2 font-medium text-left transition-colors ${
                clipboard
                  ? 'hover:bg-slate-100 text-slate-800'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              onClick={() => {
                if (clipboard) {
                  onPasteSubtree(worldPos);
                  onClose();
                }
              }}
            >
              <ClipboardPaste className="w-4 h-4 text-slate-500" />
              <span>
                Paste {clipboard ? `(${clipboard.nodes.length} nodes)` : ''}
              </span>
            </button>
          </div>

          <div className="py-1">
            <button
              id="ctx-format-tree"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 transition-colors text-left"
              onClick={() => {
                onFormatTree();
                onClose();
              }}
            >
              <FolderTree className="w-4 h-4 text-slate-500" />
              <span>Auto-Format Tree Layout</span>
            </button>
            <button
              id="ctx-zoom-fit"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 transition-colors text-left"
              onClick={() => {
                onZoomFit();
                onClose();
              }}
            >
              <Maximize className="w-4 h-4 text-slate-500" />
              <span>Zoom to Fit</span>
            </button>
          </div>
        </>
      )}

      {/* ----------------- SINGLE NODE CONTEXT MENU ----------------- */}
      {state.type === 'node' && state.targetId && selectedNodeIds.size <= 1 && (
        <>
          <div className="py-1">
            <button
              id="ctx-node-edit"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 font-medium transition-colors text-left"
              onClick={() => {
                onEditNode(state.targetId!);
                onClose();
              }}
            >
              <Edit3 className="w-4 h-4 text-blue-500" />
              <span>Edit Node Content</span>
            </button>
            <button
              id="ctx-node-add-branch"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 hover:text-blue-700 font-medium transition-colors text-left"
              onClick={() => {
                onAddChildBranch(state.targetId!);
                onClose();
              }}
            >
              <GitFork className="w-4 h-4 text-blue-500" />
              <span>Add Connected Branch</span>
            </button>
          </div>

          <div className="py-1">
            <button
              id="ctx-node-copy"
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 text-slate-800 transition-colors text-left"
              onClick={() => {
                onCopySubtree(state.targetId!);
                onClose();
              }}
            >
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-slate-500" />
                <span>Copy Subtree</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Ctrl+C</span>
            </button>
            <button
              id="ctx-node-duplicate"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 transition-colors text-left"
              onClick={() => {
                onDuplicateSubtree(state.targetId!);
                onClose();
              }}
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Duplicate Subtree</span>
            </button>
            <button
              id="ctx-node-collapse"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 transition-colors text-left"
              onClick={() => {
                onToggleCollapse(state.targetId!);
                onClose();
              }}
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <span>{selectedNode?.isCollapsed ? 'Expand Subtree' : 'Collapse Subtree'}</span>
            </button>
          </div>

          {/* Color Tag Selection */}
          <div className="px-3 py-2">
            <span className="text-[10px] font-semibold text-slate-600 block mb-1.5">Color Tag</span>
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c.hex}
                  id={`color-preset-${c.name.toLowerCase()}`}
                  title={c.name}
                  onClick={() => {
                    onChangeNodeColor(state.targetId!, c.hex);
                    onClose();
                  }}
                  className="w-5 h-5 rounded-full border border-slate-300 hover:scale-115 transition-transform"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          {/* Delete actions */}
          <div className="py-1">
            <button
              id="ctx-node-delete-subtree"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 font-medium transition-colors text-left"
              onClick={() => {
                onDeleteNode(state.targetId!, true);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Delete Subtree & Descendants</span>
            </button>
            <button
              id="ctx-node-delete-single"
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 text-slate-500 transition-colors text-left"
              onClick={() => {
                onDeleteNode(state.targetId!, false);
                onClose();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete this node only</span>
            </button>
          </div>
        </>
      )}

      {/* ----------------- EDGE CONTEXT MENU ----------------- */}
      {state.type === 'edge' && state.targetId && (
        <div className="py-1">
          <button
            id="ctx-edge-edit-answer"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 text-slate-800 font-medium transition-colors text-left"
            onClick={() => {
              onEditEdgeAnswer(state.targetId!);
              onClose();
            }}
          >
            <Edit3 className="w-4 h-4 text-blue-500" />
            <span>Edit Answer Label</span>
          </button>
          <button
            id="ctx-edge-delete"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 font-medium transition-colors text-left"
            onClick={() => {
              onDeleteEdge(state.targetId!);
              onClose();
            }}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Delete Connection</span>
          </button>
        </div>
      )}
    </div>
  );
};
