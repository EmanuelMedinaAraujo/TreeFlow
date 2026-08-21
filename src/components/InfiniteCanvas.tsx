import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  TreeNode, 
  TreeEdge, 
  GrowthDirection, 
  ViewTransform, 
  ConnectionDraft,
  SelectionBox
} from '../types/tree';
import { TreeNodeComponent } from './TreeNodeComponent';
import { TreeEdgeComponent } from './TreeEdgeComponent';

interface InfiniteCanvasProps {
  nodes: TreeNode[];
  edges: TreeEdge[];
  growthDirection: GrowthDirection;
  hiddenNodeIds: Set<string>;
  selectedNodeIds: Set<string>;
  selectedEdgeId: string | null;
  highlightedNodeIds: Set<string>;
  transform: ViewTransform;
  onTransformChange: (transform: ViewTransform) => void;
  onSelectNode: (id: string, e: React.MouseEvent) => void;
  onSelectMultipleNodes: (ids: string[]) => void;
  onSelectEdge: (id: string, e: React.MouseEvent) => void;
  onClearSelection: () => void;
  onUpdateNodesPosition: (positions: Array<{ id: string; x: number; y: number }>, isFinal: boolean) => void;
  onCompleteConnection: (sourceId: string, targetId: string) => void;
  onCreateConnectedChild: (sourceId: string, pos: { x: number; y: number }) => void;
  onToggleCollapse: (nodeId: string) => void;
  onEditNode: (node: TreeNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onCopySubtree: (nodeId: string) => void;
  onQuickAddChild: (sourceId: string) => void;
  onEditEdgeAnswer: (edge: TreeEdge) => void;
  onDeleteEdge: (edgeId: string) => void;
  onCanvasContextMenu: (e: React.MouseEvent, worldPos: { x: number; y: number }) => void;
  onNodeContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  onEdgeContextMenu: (e: React.MouseEvent, edgeId: string) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  nodes,
  edges,
  growthDirection,
  hiddenNodeIds,
  selectedNodeIds,
  selectedEdgeId,
  highlightedNodeIds,
  transform,
  onTransformChange,
  onSelectNode,
  onSelectMultipleNodes,
  onSelectEdge,
  onClearSelection,
  onUpdateNodesPosition,
  onCompleteConnection,
  onCreateConnectedChild,
  onToggleCollapse,
  onEditNode,
  onDeleteNode,
  onCopySubtree,
  onQuickAddChild,
  onEditEdgeAnswer,
  onDeleteEdge,
  onCanvasContextMenu,
  onNodeContextMenu,
  onEdgeContextMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas Panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, transformX: 0, transformY: 0 });

  // Marquee Selection Box state
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isMarqueeSelectingRef = useRef(false);
  const marqueeStartRef = useRef({ startScreenX: 0, startScreenY: 0, startWorldX: 0, startWorldY: 0 });

  // Node(s) Dragging state
  const isDraggingNodeRef = useRef(false);
  const nodeDragStartRef = useRef({
    startMouseX: 0,
    startMouseY: 0,
    nodeStarts: new Map<string, { x: number; y: number }>(),
  });

  // Connection Dragging state
  const [connectionDraft, setConnectionDraft] = useState<ConnectionDraft | null>(null);
  const connectionDraftRef = useRef<ConnectionDraft | null>(null);
  connectionDraftRef.current = connectionDraft;

  // Space key for panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Convert Screen (clientX, clientY) -> Canvas World Coordinates
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      return {
        x: (relX - transform.x) / transform.zoom,
        y: (relY - transform.y) / transform.zoom,
      };
    },
    [transform]
  );

  // Perfect Centered Mouse Wheel Zooming
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Current world position under cursor
      const worldX = (mouseX - transform.x) / transform.zoom;
      const worldY = (mouseY - transform.y) / transform.zoom;

      if (e.ctrlKey) {
        // Pinch-to-zoom on trackpad
        const zoomDelta = -e.deltaY * 0.015;
        const newZoom = Math.min(Math.max(transform.zoom * (1 + zoomDelta), 0.15), 3.5);
        onTransformChange({
          zoom: newZoom,
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        });
      } else if (e.shiftKey) {
        // Shift + Wheel = Horizontal Pan
        onTransformChange({
          ...transform,
          x: transform.x - e.deltaY,
        });
      } else {
        // Standard Mouse Wheel Zoom
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
        const newZoom = Math.min(Math.max(transform.zoom * zoomFactor, 0.15), 3.5);
        onTransformChange({
          zoom: newZoom,
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        });
      }
    },
    [transform, onTransformChange]
  );

  // Register non-passive wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle Space key toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Global Mouse Move & Mouse Up handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Panning Canvas
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        onTransformChange({
          ...transform,
          x: panStartRef.current.transformX + dx,
          y: panStartRef.current.transformY + dy,
        });
        return;
      }

      // 2. Dragging Node(s)
      if (isDraggingNodeRef.current && nodeDragStartRef.current.nodeStarts.size > 0) {
        const dx = (e.clientX - nodeDragStartRef.current.startMouseX) / transform.zoom;
        const dy = (e.clientY - nodeDragStartRef.current.startMouseY) / transform.zoom;
        
        const updatedPositions: Array<{ id: string; x: number; y: number }> = [];
        nodeDragStartRef.current.nodeStarts.forEach((startPos, id) => {
          updatedPositions.push({
            id,
            x: Math.round(startPos.x + dx),
            y: Math.round(startPos.y + dy),
          });
        });

        onUpdateNodesPosition(updatedPositions, false);
        return;
      }

      // 3. Marquee Box Selection
      if (isMarqueeSelectingRef.current) {
        const currentWorld = screenToWorld(e.clientX, e.clientY);
        setSelectionBox({
          startX: marqueeStartRef.current.startWorldX,
          startY: marqueeStartRef.current.startWorldY,
          currentX: currentWorld.x,
          currentY: currentWorld.y,
        });

        // Compute which visible nodes intersect marquee box
        const boxLeft = Math.min(marqueeStartRef.current.startWorldX, currentWorld.x);
        const boxRight = Math.max(marqueeStartRef.current.startWorldX, currentWorld.x);
        const boxTop = Math.min(marqueeStartRef.current.startWorldY, currentWorld.y);
        const boxBottom = Math.max(marqueeStartRef.current.startWorldY, currentWorld.y);

        const intersectedIds: string[] = [];
        nodes.forEach(node => {
          if (hiddenNodeIds.has(node.id)) return;
          const nw = node.width || 220;
          const nh = node.height || 110;
          const nodeRight = node.x + nw;
          const nodeBottom = node.y + nh;

          const intersects =
            node.x < boxRight &&
            nodeRight > boxLeft &&
            node.y < boxBottom &&
            nodeBottom > boxTop;

          if (intersects) {
            intersectedIds.push(node.id);
          }
        });

        onSelectMultipleNodes(intersectedIds);
        return;
      }

      // 4. Dragging Connection Draft
      if (connectionDraftRef.current) {
        const world = screenToWorld(e.clientX, e.clientY);
        setConnectionDraft(prev => (prev ? { ...prev, currentX: world.x, currentY: world.y } : null));
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      // End Canvas Pan
      if (isPanningRef.current) {
        isPanningRef.current = false;
      }

      // End Node Drag and commit final position to Undo history
      if (isDraggingNodeRef.current) {
        isDraggingNodeRef.current = false;
        if (nodeDragStartRef.current.nodeStarts.size > 0) {
          const dx = (e.clientX - nodeDragStartRef.current.startMouseX) / transform.zoom;
          const dy = (e.clientY - nodeDragStartRef.current.startMouseY) / transform.zoom;
          
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            const finalPositions: Array<{ id: string; x: number; y: number }> = [];
            nodeDragStartRef.current.nodeStarts.forEach((startPos, id) => {
              finalPositions.push({
                id,
                x: Math.round(startPos.x + dx),
                y: Math.round(startPos.y + dy),
              });
            });
            onUpdateNodesPosition(finalPositions, true);
          }
          nodeDragStartRef.current.nodeStarts.clear();
        }
      }

      // End Marquee Selection
      if (isMarqueeSelectingRef.current) {
        isMarqueeSelectingRef.current = false;
        setSelectionBox(null);
      }

      // End Connection Draft
      if (connectionDraftRef.current) {
        const draft = connectionDraftRef.current;
        setConnectionDraft(null);

        // Check if mouse released over another node
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const targetNodeEl = targetElement?.closest('[id^="node-"]');

        if (targetNodeEl) {
          const targetId = targetNodeEl.id.replace('node-', '');
          if (targetId && targetId !== draft.sourceNodeId) {
            onCompleteConnection(draft.sourceNodeId, targetId);
            return;
          }
        }

        // If dropped on empty canvas space -> create connected child node there!
        const worldPos = screenToWorld(e.clientX, e.clientY);
        const distMoved = Math.hypot(worldPos.x - draft.startX, worldPos.y - draft.startY);
        if (distMoved > 40) {
          onCreateConnectedChild(draft.sourceNodeId, worldPos);
        }
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [
    transform, 
    nodes,
    hiddenNodeIds,
    onTransformChange, 
    onUpdateNodesPosition, 
    onSelectMultipleNodes,
    onCompleteConnection, 
    onCreateConnectedChild, 
    screenToWorld
  ]);

  // Start Canvas Pan or Marquee Selection
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; // Right click handled by context menu

    // Middle mouse button or Space + Click -> Pan Canvas
    if (e.button === 1 || isSpacePressed) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      };
      return;
    }

    // Left click on empty canvas -> start Marquee Box Selection
    if (e.button === 0) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      isMarqueeSelectingRef.current = true;
      marqueeStartRef.current = {
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startWorldX: worldPos.x,
        startWorldY: worldPos.y,
      };

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        onClearSelection();
      }
    }
  };

  // Start Node Drag (single node or group of selected nodes)
  const handleStartDragNode = (nodeId: string, e: React.MouseEvent) => {
    if (e.button !== 0 || isSpacePressed) return;
    
    // If clicked node is not already selected, select it
    let targetNodesToDrag: string[] = [];
    if (selectedNodeIds.has(nodeId)) {
      targetNodesToDrag = Array.from(selectedNodeIds);
    } else {
      targetNodesToDrag = [nodeId];
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        onSelectNode(nodeId, e);
      }
    }

    isDraggingNodeRef.current = true;
    const startMap = new Map<string, { x: number; y: number }>();
    
    targetNodesToDrag.forEach(id => {
      const n = nodes.find(item => item.id === id);
      if (n) {
        startMap.set(id, { x: n.x, y: n.y });
      }
    });

    nodeDragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      nodeStarts: startMap,
    };
  };

  // Start Connection Draft from node handle
  const handleStartConnection = (sourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const sourceW = sourceNode.width || 220;
    const sourceH = sourceNode.height || 110;

    let startX = 0;
    let startY = 0;
    if (growthDirection === 'TB') {
      startX = sourceNode.x + sourceW / 2;
      startY = sourceNode.y + sourceH;
    } else if (growthDirection === 'LR') {
      startX = sourceNode.x + sourceW;
      startY = sourceNode.y + sourceH / 2;
    } else {
      startX = sourceNode.x;
      startY = sourceNode.y + sourceH / 2;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    setConnectionDraft({
      sourceNodeId: sourceId,
      startX,
      startY,
      currentX: world.x,
      currentY: world.y,
    });
  };

  // Right-Click Context Menu on Canvas Background
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    onCanvasContextMenu(e, worldPos);
  };

  // Filter out hidden descendants
  const visibleNodes = nodes.filter(n => !hiddenNodeIds.has(n.id));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visibleEdges = edges.filter(
    e => !hiddenNodeIds.has(e.sourceNodeId) && !hiddenNodeIds.has(e.targetNodeId)
  );

  return (
    <div
      ref={containerRef}
      id="infinite-canvas-viewport"
      className={`relative w-full h-full overflow-hidden bg-slate-100 select-none ${
        isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={handleCanvasContextMenu}
    >
      {/* Infinite Grid Background */}
      <div
        id="infinite-plane-grid"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #94a3b8 1.2px, transparent 1.2px)`,
          backgroundSize: `${24 * transform.zoom}px ${24 * transform.zoom}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
          opacity: 0.65,
        }}
      />

      {/* World Coordinate Transform Wrapper */}
      <div
        id="infinite-canvas-plane"
        className="absolute origin-top-left will-change-transform"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        }}
      >
        {/* SVG Layer for Edges, Curves, Arrow Markers, and Draft Link */}
        <svg
          id="tree-edges-svg-layer"
          className="absolute top-0 left-0 w-[50000px] h-[50000px] pointer-events-none -translate-x-[25000px] -translate-y-[25000px] overflow-visible"
        >
          <g transform="translate(25000, 25000)">
            <defs>
              {/* Default Arrowhead Marker */}
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
              </marker>

              {/* Selected Arrowhead Marker */}
              <marker
                id="arrowhead-selected"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
              </marker>

              {/* Highlighted Arrowhead Marker */}
              <marker
                id="arrowhead-highlight"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
              </marker>
            </defs>

            {/* Render all visible connecting edges */}
            {visibleEdges.map(edge => {
              const sourceNode = nodeMap.get(edge.sourceNodeId);
              const targetNode = nodeMap.get(edge.targetNodeId);
              if (!sourceNode || !targetNode) return null;

              return (
                <TreeEdgeComponent
                  key={edge.id}
                  edge={edge}
                  sourceNode={sourceNode}
                  targetNode={targetNode}
                  growthDirection={growthDirection}
                  isSelected={selectedEdgeId === edge.id}
                  isHighlighted={
                    highlightedNodeIds.has(edge.sourceNodeId) &&
                    highlightedNodeIds.has(edge.targetNodeId)
                  }
                  onSelect={onSelectEdge}
                  onEditAnswer={onEditEdgeAnswer}
                  onDelete={onDeleteEdge}
                  onContextMenu={onEdgeContextMenu}
                />
              );
            })}

            {/* Render Active Connection Draft Rubberband Line */}
            {connectionDraft && (
              <g className="pointer-events-none">
                <path
                  d={`M ${connectionDraft.startX} ${connectionDraft.startY} C ${
                    growthDirection === 'TB'
                      ? `${connectionDraft.startX} ${(connectionDraft.startY + connectionDraft.currentY) / 2}, ${connectionDraft.currentX} ${(connectionDraft.startY + connectionDraft.currentY) / 2}`
                      : `${(connectionDraft.startX + connectionDraft.currentX) / 2} ${connectionDraft.startY}, ${(connectionDraft.startX + connectionDraft.currentX) / 2} ${connectionDraft.currentY}`
                  }, ${connectionDraft.currentX} ${connectionDraft.currentY}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  markerEnd="url(#arrowhead-selected)"
                  className="animate-pulse"
                />
                <circle
                  cx={connectionDraft.currentX}
                  cy={connectionDraft.currentY}
                  r="5"
                  fill="#3b82f6"
                />
              </g>
            )}

            {/* Render Selection Marquee Box in World Space */}
            {selectionBox && (
              <rect
                x={Math.min(selectionBox.startX, selectionBox.currentX)}
                y={Math.min(selectionBox.startY, selectionBox.currentY)}
                width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                className="pointer-events-none"
              />
            )}
          </g>
        </svg>

        {/* DOM Layer for Tree Nodes */}
        {visibleNodes.map(node => (
          <TreeNodeComponent
            key={node.id}
            node={node}
            growthDirection={growthDirection}
            isSelected={selectedNodeIds.has(node.id) && selectedNodeIds.size === 1}
            isMultiSelected={selectedNodeIds.has(node.id) && selectedNodeIds.size > 1}
            edges={edges}
            isHighlighted={highlightedNodeIds.has(node.id)}
            onSelect={onSelectNode}
            onStartDrag={handleStartDragNode}
            onStartConnection={handleStartConnection}
            onToggleCollapse={onToggleCollapse}
            onEdit={onEditNode}
            onDelete={onDeleteNode}
            onCopySubtree={onCopySubtree}
            onQuickAddChild={onQuickAddChild}
            onContextMenu={onNodeContextMenu}
          />
        ))}
      </div>

      {/* Marquee Selection Counter Pill */}
      {selectedNodeIds.size > 1 && (
        <div
          id="multi-selection-badge"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-2 border border-slate-700 pointer-events-none z-40"
        >
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span>{selectedNodeIds.size} nodes selected (Ctrl+C to copy, Delete to remove)</span>
        </div>
      )}
    </div>
  );
};
