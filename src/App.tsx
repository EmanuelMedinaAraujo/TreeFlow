import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TreeData, 
  TreeNode, 
  TreeEdge, 
  GrowthDirection, 
  ViewTransform, 
  SubtreeClipboard, 
  ContextMenuState 
} from './types/tree';
import { sampleTrees } from './utils/sampleTrees';
import { 
  generateId, 
  findRootNodes, 
  getDescendantNodeIds, 
  getHiddenNodeIds, 
  extractSubtree, 
  extractSelectedNodes,
  instantiateSubtree, 
  wouldCreateCycle,
  getNodeRole
} from './utils/treeUtils';
import { formatTreeLayout } from './utils/treeLayout';
import { InfiniteCanvas } from './components/InfiniteCanvas';
import { Toolbar } from './components/Toolbar';
import { ContextMenu } from './components/ContextMenu';
import { NodeEditModal } from './components/NodeEditModal';
import { LinkAnswerModal } from './components/LinkAnswerModal';
import { ExportModal } from './components/ExportModal';
import { ImportModal } from './components/ImportModal';
import { TreeSimulatorModal } from './components/TreeSimulatorModal';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { Minimap } from './components/Minimap';
import { Sidebar } from './components/Sidebar';
import { Check, Info, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const STORAGE_KEY = 'decision_tree_canvas_data_v2';

export default function App() {
  // Tree state
  const [tree, setTree] = useState<TreeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return sampleTrees.techSupport;
  });

  // Undo / Redo history
  const [historyPast, setHistoryPast] = useState<TreeData[]>([]);
  const [historyFuture, setHistoryFuture] = useState<TreeData[]>([]);

  // Viewport Transform (Pan & Zoom)
  const [transform, setTransform] = useState<ViewTransform>({
    x: 100,
    y: 80,
    zoom: 1,
  });

  // Window container dimensions
  const [containerDim, setContainerDim] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Subtree / Multi-node Clipboard
  const [clipboard, setClipboard] = useState<SubtreeClipboard | null>(null);

  // Multi-Selection State
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');

  // Toast Banner Message
  const [toastMessage, setToastMessage] = useState<{ text: string; icon?: 'check' | 'info' } | null>(null);

  // Modals & Panels
  const [isNodeEditOpen, setIsNodeEditOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<TreeNode | null>(null);

  const [isLinkAnswerOpen, setIsLinkAnswerOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    sourceId: string;
    targetId: string;
    existingEdge?: TreeEdge;
  } | null>(null);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    type: 'canvas',
  });

  // Track container resize
  useEffect(() => {
    const handleResize = () => {
      setContainerDim({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
    } catch {
      // ignore
    }
  }, [tree]);

  // Show Toast Helper
  const showToast = useCallback((text: string, icon: 'check' | 'info' = 'info') => {
    setToastMessage({ text, icon });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 2800);
  }, []);

  // Push new state into undo history
  const updateTreeState = useCallback((newTree: TreeData | ((prev: TreeData) => TreeData), pushHistory = true) => {
    setTree(prev => {
      const updated = typeof newTree === 'function' ? newTree(prev) : newTree;
      if (pushHistory) {
        setHistoryPast(past => [...past.slice(-40), prev]);
        setHistoryFuture([]);
      }
      return updated;
    });
  }, []);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast(past => past.slice(0, -1));
    setHistoryFuture(future => [tree, ...future]);
    setTree(previous);
    showToast('Undo performed', 'info');
  }, [historyPast, tree, showToast]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture(future => future.slice(1));
    setHistoryPast(past => [...past, tree]);
    setTree(next);
    showToast('Redo performed', 'info');
  }, [historyFuture, tree, showToast]);

  // Compute hidden nodes from collapsed subtrees
  const hiddenNodeIds = getHiddenNodeIds(tree.nodes, tree.edges);

  // Compute highlighted nodes from search
  const highlightedNodeIds = new Set<string>();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    tree.nodes.forEach(n => {
      if (
        n.question.toLowerCase().includes(q) ||
        (n.description && n.description.toLowerCase().includes(q))
      ) {
        highlightedNodeIds.add(n.id);
      }
    });
    tree.edges.forEach(e => {
      if (e.answer.toLowerCase().includes(q)) {
        highlightedNodeIds.add(e.sourceNodeId);
        highlightedNodeIds.add(e.targetNodeId);
      }
    });
  }

  // Auto-Format Tree Layout
  const handleFormatTree = useCallback(() => {
    const formattedNodes = formatTreeLayout(tree.nodes, tree.edges, tree.growthDirection);
    updateTreeState({
      ...tree,
      nodes: formattedNodes,
    });
    showToast(`Formatted tree hierarchy (${tree.growthDirection})`, 'check');
  }, [tree, updateTreeState, showToast]);

  // Change Growth Direction
  const handleChangeGrowthDirection = (dir: GrowthDirection) => {
    const formattedNodes = formatTreeLayout(tree.nodes, tree.edges, dir);
    updateTreeState({
      ...tree,
      growthDirection: dir,
      nodes: formattedNodes,
    });
    showToast(`Direction: ${dir === 'TB' ? 'Top-to-Bottom' : dir === 'LR' ? 'Left-to-Right' : 'Right-to-Left'}`, 'info');
  };

  // Zoom to Fit all nodes
  const handleZoomFit = useCallback(() => {
    const visibleNodes = tree.nodes.filter(n => !hiddenNodeIds.has(n.id));
    if (visibleNodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    visibleNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + (node.width || 220));
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + (node.height || 110));
    });

    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const availableW = window.innerWidth;
    const availableH = window.innerHeight - 50;

    const zoomX = availableW / contentW;
    const zoomY = availableH / contentH;
    const newZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.2), 1.6);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      zoom: newZoom,
      x: availableW / 2 - centerX * newZoom,
      y: (availableH / 2 + 50) - centerY * newZoom,
    });
  }, [tree.nodes, hiddenNodeIds]);

  // Zoom In / Out / Reset
  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom * 1.2, 3.5),
    }));
  };

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom * 0.8, 0.2),
    }));
  };

  const handleZoomReset = () => {
    setTransform(prev => ({
      ...prev,
      zoom: 1,
    }));
  };

  const handleUpdateZoom = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, 0.15), 3.5);
    setTransform(prev => ({
      ...prev,
      zoom: clamped,
    }));
  };

  // Navigate to specific World coordinate
  const handleNavigateTo = (worldX: number, worldY: number) => {
    setTransform(prev => ({
      ...prev,
      x: window.innerWidth / 2 - worldX * prev.zoom,
      y: window.innerHeight / 2 - worldY * prev.zoom,
    }));
  };

  // Selection handlers
  const handleSelectNode = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedNodeIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedNodeIds(new Set([id]));
    }
    setSelectedEdgeId(null);
  };

  const handleSelectMultipleNodes = (ids: string[]) => {
    setSelectedNodeIds(new Set(ids));
    setSelectedEdgeId(null);
  };

  const handleSelectEdge = (id: string) => {
    setSelectedEdgeId(id);
    setSelectedNodeIds(new Set());
  };

  const handleClearSelection = () => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeId(null);
  };

  // Add a new node at given world position
  const handleAddNode = (pos: { x: number; y: number }) => {
    const newNode: TreeNode = {
      id: generateId('node'),
      question: 'New Question or Step',
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      type: 'node',
      color: '#3b82f6',
      isRoot: tree.nodes.length === 0,
    };

    updateTreeState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setSelectedNodeIds(new Set([newNode.id]));
    setEditingNode(newNode);
    setIsNodeEditOpen(true);
  };

  // Add top-level root node
  const handleAddRootNode = () => {
    const worldCenter = {
      x: (-transform.x + window.innerWidth / 2) / transform.zoom - 110,
      y: (-transform.y + window.innerHeight / 2) / transform.zoom - 55,
    };
    handleAddNode(worldCenter);
  };

  // Update multiple node positions during / after dragging
  const handleUpdateNodesPosition = (
    positions: Array<{ id: string; x: number; y: number }>,
    isFinal: boolean
  ) => {
    const posMap = new Map(positions.map(p => [p.id, p]));
    updateTreeState(
      prev => ({
        ...prev,
        nodes: prev.nodes.map(n => {
          const updated = posMap.get(n.id);
          return updated ? { ...n, x: updated.x, y: updated.y } : n;
        }),
      }),
      isFinal // commit to undo history when mouse drag completes
    );
  };

  // Complete Connection between Source and Target node
  const handleCompleteConnection = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    // Check for existing connection
    const existing = tree.edges.find(e => e.sourceNodeId === sourceId && e.targetNodeId === targetId);
    if (existing) {
      setPendingConnection({ sourceId, targetId, existingEdge: existing });
      setIsLinkAnswerOpen(true);
      return;
    }

    // Check for cycle to maintain hierarchical tree structure
    if (wouldCreateCycle(sourceId, targetId, tree.edges)) {
      showToast('Cannot connect: Cycle loop prevented in tree hierarchy.', 'info');
      return;
    }

    setPendingConnection({ sourceId, targetId });
    setIsLinkAnswerOpen(true);
  };

  // Create connected child node on dragging to empty space
  const handleCreateConnectedChild = (sourceId: string, pos: { x: number; y: number }) => {
    const newNode: TreeNode = {
      id: generateId('node'),
      question: 'Next decision step or conclusion',
      x: Math.round(pos.x),
      y: Math.round(pos.y),
      type: 'node',
      color: '#3b82f6',
    };

    updateTreeState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setPendingConnection({ sourceId, targetId: newNode.id });
    setIsLinkAnswerOpen(true);
  };

  // Save Link Answer from Modal
  const handleSaveLinkAnswer = (answerText: string) => {
    if (!pendingConnection) return;

    const { sourceId, targetId, existingEdge } = pendingConnection;

    if (existingEdge) {
      // Update existing edge
      updateTreeState(prev => ({
        ...prev,
        edges: prev.edges.map(e => (e.id === existingEdge.id ? { ...e, answer: answerText } : e)),
      }));
      showToast('Answer condition updated', 'check');
    } else {
      // Create new edge
      const newEdge: TreeEdge = {
        id: generateId('edge'),
        sourceNodeId: sourceId,
        targetNodeId: targetId,
        answer: answerText,
      };

      updateTreeState(prev => ({
        ...prev,
        edges: [...prev.edges, newEdge],
      }));
      showToast('Connected with answer condition!', 'check');
    }

    setPendingConnection(null);
  };

  // Quick Add Child Option
  const handleQuickAddChild = (sourceId: string) => {
    const sourceNode = tree.nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const existingChildren = tree.edges.filter(e => e.sourceNodeId === sourceId);
    const childOffset = existingChildren.length * 240;

    let targetX = sourceNode.x;
    let targetY = sourceNode.y;

    if (tree.growthDirection === 'TB') {
      targetX = sourceNode.x - 80 + childOffset;
      targetY = sourceNode.y + 200;
    } else if (tree.growthDirection === 'LR') {
      targetX = sourceNode.x + 300;
      targetY = sourceNode.y - 60 + childOffset;
    } else {
      targetX = sourceNode.x - 300;
      targetY = sourceNode.y - 60 + childOffset;
    }

    const newNode: TreeNode = {
      id: generateId('node'),
      question: 'New decision or outcome step',
      x: Math.round(targetX),
      y: Math.round(targetY),
      type: 'node',
      color: '#3b82f6',
    };

    updateTreeState(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setPendingConnection({ sourceId, targetId: newNode.id });
    setIsLinkAnswerOpen(true);
  };

  // Toggle Collapse Subtree
  const handleToggleCollapse = (nodeId: string) => {
    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n
      ),
    }));
  };

  // Expand All
  const handleExpandAll = () => {
    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => ({ ...n, isCollapsed: false })),
    }));
    showToast('All subtrees expanded', 'info');
  };

  // Collapse All
  const handleCollapseAll = () => {
    const roots = findRootNodes(tree.nodes, tree.edges);
    const rootIds = new Set(roots.map(r => r.id));

    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => ({
        ...n,
        isCollapsed: !rootIds.has(n.id) && tree.edges.some(e => e.sourceNodeId === n.id),
      })),
    }));
    showToast('Subtrees collapsed', 'info');
  };

  // Copy Single Node Subtree to Clipboard
  const handleCopySubtree = useCallback((nodeId: string) => {
    const extracted = extractSubtree(nodeId, tree.nodes, tree.edges);
    if (extracted) {
      setClipboard(extracted);
      showToast(`Copied subtree (${extracted.nodes.length} nodes)`, 'check');
    }
  }, [tree.nodes, tree.edges, showToast]);

  // Copy Multi-Selected Nodes to Clipboard
  const handleCopySelectedNodes = useCallback(() => {
    if (selectedNodeIds.size === 0) return;
    const extracted = extractSelectedNodes(selectedNodeIds, tree.nodes, tree.edges);
    if (extracted) {
      setClipboard(extracted);
      showToast(`Copied ${extracted.nodes.length} selected nodes`, 'check');
    }
  }, [selectedNodeIds, tree.nodes, tree.edges, showToast]);

  // Paste Subtree / Multi-nodes from Clipboard
  const handlePasteSubtree = useCallback((targetPos: { x: number; y: number }) => {
    if (!clipboard) return;

    const { newNodes, newEdges, newRootId } = instantiateSubtree(clipboard, targetPos);

    updateTreeState(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes],
      edges: [...prev.edges, ...newEdges],
    }));

    setSelectedNodeIds(new Set(newNodes.map(n => n.id)));
    showToast(`Pasted ${newNodes.length} node(s)`, 'check');
  }, [clipboard, updateTreeState, showToast]);

  // Duplicate Subtree in place
  const handleDuplicateSubtree = (nodeId: string) => {
    const extracted = extractSubtree(nodeId, tree.nodes, tree.edges);
    if (!extracted) return;

    const targetNode = tree.nodes.find(n => n.id === nodeId);
    const pos = {
      x: (targetNode?.x || 0) + 120,
      y: (targetNode?.y || 0) + 120,
    };

    const { newNodes, newEdges } = instantiateSubtree(extracted, pos);

    updateTreeState(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes],
      edges: [...prev.edges, ...newEdges],
    }));

    setSelectedNodeIds(new Set(newNodes.map(n => n.id)));
    showToast(`Duplicated subtree (${newNodes.length} nodes)`, 'check');
  };

  // Delete Single Node (with or without descendants)
  const handleDeleteNode = (nodeId: string, deleteDescendants = true) => {
    const nodesToRemove = new Set<string>();
    nodesToRemove.add(nodeId);

    if (deleteDescendants) {
      const descendants = getDescendantNodeIds(nodeId, tree.edges);
      descendants.forEach(id => nodesToRemove.add(id));
    }

    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => !nodesToRemove.has(n.id)),
      edges: prev.edges.filter(
        e => !nodesToRemove.has(e.sourceNodeId) && !nodesToRemove.has(e.targetNodeId)
      ),
    }));

    setSelectedNodeIds(prev => {
      const next = new Set(prev);
      nodesToRemove.forEach(id => next.delete(id));
      return next;
    });

    showToast(`Deleted ${nodesToRemove.size} node(s)`, 'info');
  };

  // Delete All Currently Selected Nodes
  const handleDeleteSelectedNodes = () => {
    if (selectedNodeIds.size === 0) return;
    const count = selectedNodeIds.size;

    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => !selectedNodeIds.has(n.id)),
      edges: prev.edges.filter(
        e => !selectedNodeIds.has(e.sourceNodeId) && !selectedNodeIds.has(e.targetNodeId)
      ),
    }));

    setSelectedNodeIds(new Set());
    showToast(`Deleted ${count} selected node(s)`, 'info');
  };

  // Delete Edge
  const handleDeleteEdge = (edgeId: string) => {
    updateTreeState(prev => ({
      ...prev,
      edges: prev.edges.filter(e => e.id !== edgeId),
    }));
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
    }
    showToast('Deleted connection', 'info');
  };

  // Edit Edge Answer
  const handleEditEdgeAnswer = (edge: TreeEdge) => {
    setPendingConnection({
      sourceId: edge.sourceNodeId,
      targetId: edge.targetNodeId,
      existingEdge: edge,
    });
    setIsLinkAnswerOpen(true);
  };

  // Change Node Color Tag
  const handleChangeNodeColor = (nodeId: string, color: string) => {
    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => (n.id === nodeId ? { ...n, color } : n)),
    }));
  };

  // Save Node from Edit Modal
  const handleSaveNodeEdit = (updatedProps: Partial<TreeNode>) => {
    if (!editingNode) return;
    updateTreeState(prev => ({
      ...prev,
      nodes: prev.nodes.map(n =>
        n.id === editingNode.id ? { ...n, ...updatedProps } : n
      ),
    }));
    showToast('Node saved', 'check');
    setEditingNode(null);
  };

  // Context Menu Handlers
  const handleCanvasContextMenu = (e: React.MouseEvent, worldPos: { x: number; y: number }) => {
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'canvas',
      worldPos,
    });
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(new Set([nodeId]));
    }
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: selectedNodeIds.size > 1 ? 'multi_node' : 'node',
      targetId: nodeId,
    });
  };

  const handleEdgeContextMenu = (e: React.MouseEvent, edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeIds(new Set());
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'edge',
      targetId: edgeId,
    });
  };

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+C, Ctrl+V, Delete, Format)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(activeTag)) return;

      const isMetaOrCtrl = e.metaKey || e.ctrlKey;

      // Copy (Ctrl + C) - handles multi-select or single node
      if (isMetaOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedNodeIds.size > 1) {
          e.preventDefault();
          handleCopySelectedNodes();
          return;
        } else if (selectedNodeIds.size === 1) {
          e.preventDefault();
          const firstId = Array.from(selectedNodeIds)[0] as string;
          if (firstId) handleCopySubtree(firstId);
          return;
        }
      }

      // Paste (Ctrl + V)
      if (isMetaOrCtrl && e.key.toLowerCase() === 'v' && clipboard) {
        e.preventDefault();
        const centerPos = {
          x: (-transform.x + window.innerWidth / 2) / transform.zoom - 100,
          y: (-transform.y + window.innerHeight / 2) / transform.zoom - 50,
        };
        handlePasteSubtree(centerPos);
        return;
      }

      // Undo (Ctrl + Z)
      if (isMetaOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo (Ctrl + Y or Ctrl + Shift + Z)
      if (isMetaOrCtrl && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Format Layout (Ctrl + F or Alt + F)
      if (isMetaOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormatTree();
        return;
      }

      // Delete Selected Nodes / Edge
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIds.size > 1) {
          e.preventDefault();
          handleDeleteSelectedNodes();
        } else if (selectedNodeIds.size === 1) {
          e.preventDefault();
          const firstId = Array.from(selectedNodeIds)[0] as string;
          if (firstId) handleDeleteNode(firstId, true);
        } else if (selectedEdgeId) {
          e.preventDefault();
          handleDeleteEdge(selectedEdgeId);
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeIds, 
    selectedEdgeId, 
    clipboard, 
    transform, 
    handleCopySubtree, 
    handleCopySelectedNodes,
    handlePasteSubtree, 
    handleUndo, 
    handleRedo, 
    handleFormatTree
  ]);

  const singleSelectedNodeId = selectedNodeIds.size === 1 ? (Array.from(selectedNodeIds)[0] as string) : null;
  const selectedNode = singleSelectedNodeId ? tree.nodes.find(n => n.id === singleSelectedNodeId) || null : null;
  const pendingSourceNode = pendingConnection ? tree.nodes.find(n => n.id === pendingConnection.sourceId) || null : null;
  const pendingTargetNode = pendingConnection ? tree.nodes.find(n => n.id === pendingConnection.targetId) || null : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 select-none font-sans text-slate-800 flex flex-col">
      {/* Top Main Toolbar */}
      <Toolbar
        tree={tree}
        zoom={transform.zoom}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        searchQuery={searchQuery}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onSearchChange={setSearchQuery}
        onUpdateTreeName={(name) => updateTreeState(prev => ({ ...prev, name }))}
        onChangeGrowthDirection={handleChangeGrowthDirection}
        onFormatTree={handleFormatTree}
        onAddRootNode={handleAddRootNode}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onZoomReset={handleZoomReset}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Workspace with Sidebar & Infinite Canvas */}
      <div className="flex flex-1 w-full h-[calc(100vh-48px)] mt-12 overflow-hidden bg-slate-100 relative">
        {/* High Density Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          tree={tree}
          zoom={transform.zoom}
          onUpdateZoom={handleUpdateZoom}
          onChangeGrowthDirection={handleChangeGrowthDirection}
          onFormatTree={handleFormatTree}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomFit={handleZoomFit}
          onZoomReset={handleZoomReset}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          onAddRootNode={handleAddRootNode}
        />

        {/* Infinite Canvas Viewport */}
        <main className="flex-1 relative h-full overflow-hidden">
          <InfiniteCanvas
            nodes={tree.nodes}
            edges={tree.edges}
            growthDirection={tree.growthDirection}
            hiddenNodeIds={hiddenNodeIds}
            selectedNodeIds={selectedNodeIds}
            selectedEdgeId={selectedEdgeId}
            highlightedNodeIds={highlightedNodeIds}
            transform={transform}
            onTransformChange={setTransform}
            onSelectNode={handleSelectNode}
            onSelectMultipleNodes={handleSelectMultipleNodes}
            onSelectEdge={handleSelectEdge}
            onClearSelection={handleClearSelection}
            onUpdateNodesPosition={handleUpdateNodesPosition}
            onCompleteConnection={handleCompleteConnection}
            onCreateConnectedChild={handleCreateConnectedChild}
            onToggleCollapse={handleToggleCollapse}
            onEditNode={(node) => {
              setEditingNode(node);
              setIsNodeEditOpen(true);
            }}
            onDeleteNode={(id) => handleDeleteNode(id, true)}
            onCopySubtree={handleCopySubtree}
            onQuickAddChild={handleQuickAddChild}
            onEditEdgeAnswer={handleEditEdgeAnswer}
            onDeleteEdge={handleDeleteEdge}
            onCanvasContextMenu={handleCanvasContextMenu}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
          />

          {/* Bottom Left Status Pill */}
          <div className="absolute bottom-5 left-5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-20 border border-slate-700/60 hidden sm:block">
            <p className="text-[10px] text-white flex items-center gap-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Canvas Ready: {tree.nodes.length} Nodes • {tree.edges.length} Branches • Drag marquee box to multi-select</span>
            </p>
          </div>

          {/* Bottom Right Floating Quick Widget & Minimap */}
          <div className="fixed bottom-5 right-5 z-30 flex items-end gap-2">
            <Minimap
              nodes={tree.nodes}
              edges={tree.edges}
              hiddenNodeIds={hiddenNodeIds}
              transform={transform}
              containerWidth={containerDim.width}
              containerHeight={containerDim.height - 48}
              onNavigateTo={handleNavigateTo}
              isOpen={isMinimapOpen}
              onToggle={() => setIsMinimapOpen(prev => !prev)}
            />

            <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-lg p-1 shadow-md flex items-center gap-0.5 select-none">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-700 px-1 min-w-[36px] text-center">
                {Math.round(transform.zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomFit}
                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                title="Zoom Fit"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        clipboard={clipboard}
        selectedNode={selectedNode}
        selectedNodeIds={selectedNodeIds}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onAddNode={handleAddNode}
        onPasteSubtree={handlePasteSubtree}
        onEditNode={(nodeId) => {
          const n = tree.nodes.find(node => node.id === nodeId);
          if (n) {
            setEditingNode(n);
            setIsNodeEditOpen(true);
          }
        }}
        onCopySubtree={handleCopySubtree}
        onCopySelectedNodes={handleCopySelectedNodes}
        onDuplicateSubtree={handleDuplicateSubtree}
        onToggleCollapse={handleToggleCollapse}
        onChangeNodeColor={handleChangeNodeColor}
        onDeleteNode={handleDeleteNode}
        onDeleteSelectedNodes={handleDeleteSelectedNodes}
        onAddChildBranch={handleQuickAddChild}
        onEditEdgeAnswer={(edgeId) => {
          const edge = tree.edges.find(e => e.id === edgeId);
          if (edge) handleEditEdgeAnswer(edge);
        }}
        onDeleteEdge={handleDeleteEdge}
        onFormatTree={handleFormatTree}
        onZoomFit={handleZoomFit}
      />

      {/* Node Edit / Create Modal */}
      <NodeEditModal
        node={editingNode}
        role={editingNode ? getNodeRole(editingNode.id, tree.edges) : undefined}
        isOpen={isNodeEditOpen}
        onClose={() => {
          setIsNodeEditOpen(false);
          setEditingNode(null);
        }}
        onSave={handleSaveNodeEdit}
      />

      {/* Link Answer Configuration Modal */}
      <LinkAnswerModal
        isOpen={isLinkAnswerOpen}
        sourceNode={pendingSourceNode}
        targetNode={pendingTargetNode}
        edge={pendingConnection?.existingEdge || null}
        onClose={() => {
          setIsLinkAnswerOpen(false);
          setPendingConnection(null);
        }}
        onSave={handleSaveLinkAnswer}
      />

      {/* Export as Text File Modal */}
      <ExportModal
        tree={tree}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Import / Load Templates Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportTree={(imported) => {
          updateTreeState(imported);
          setTimeout(handleZoomFit, 100);
          showToast(`Loaded "${imported.name}"`, 'check');
        }}
      />

      {/* Decision Tree Interactive Simulator Modal */}
      <TreeSimulatorModal
        tree={tree}
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSelectNodeOnCanvas={(nodeId) => {
          setSelectedNodeIds(new Set([nodeId]));
          const node = tree.nodes.find(n => n.id === nodeId);
          if (node) {
            handleNavigateTo(node.x + 110, node.y + 55);
          }
        }}
      />

      {/* Keyboard Shortcuts & Gestures Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Floating Toast Notification Banner */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white rounded-xl shadow-lg border border-slate-700/60 flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {toastMessage.icon === 'check' ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Info className="w-3.5 h-3.5 text-blue-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
