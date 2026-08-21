export type GrowthDirection = 'TB' | 'LR' | 'RL';

export type NodeType = 'question' | 'decision' | 'outcome' | 'node';

export interface TreeNode {
  id: string;
  question: string;
  description?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isRoot?: boolean;
  type?: NodeType;
  color?: string; // Hex or theme color for tag
  isCollapsed?: boolean;
}

export interface TreeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  answer: string; // The answer to the source question that leads to target node
  description?: string;
}

export interface TreeData {
  id?: string;
  name: string;
  growthDirection: GrowthDirection;
  nodes: TreeNode[];
  edges: TreeEdge[];
  exportSignature?: string; // signature to verify files exported by Decision Tree Studio
  version?: string;
}

export interface SubtreeClipboard {
  rootId?: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  copiedAt: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface ConnectionDraft {
  sourceNodeId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge' | 'multi_node';
  targetId?: string;
  targetIds?: string[];
  worldPos?: { x: number; y: number };
}

export type ExportFormat = 'outline' | 'markdown' | 'mermaid' | 'json' | 'yaml' | 'paths';

