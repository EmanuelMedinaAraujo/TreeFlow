import { GrowthDirection, TreeNode, TreeEdge } from '../types/tree';
import { findRootNodes, getChildEdges } from './treeUtils';

const DEFAULT_NODE_WIDTH = 260;
const DEFAULT_NODE_HEIGHT = 130;
const LEVEL_SPACING = 120; // Distance between parent level and child level
const SIBLING_SPACING = 50; // Minimum gap between sibling nodes

interface LayoutNode {
  id: string;
  width: number;
  height: number;
  children: LayoutNode[];
  x: number;
  y: number;
  treeBreadth: number; // total breadth occupied by this subtree
}

/**
 * Format the entire tree into a clean hierarchical layout according to growth direction
 */
export function formatTreeLayout(
  nodes: TreeNode[],
  edges: TreeEdge[],
  direction: GrowthDirection = 'TB'
): TreeNode[] {
  if (nodes.length === 0) return [];

  const roots = findRootNodes(nodes, edges);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Build hierarchy tree structures for all roots
  const visited = new Set<string>();

  function buildHierarchy(nodeId: string): LayoutNode {
    visited.add(nodeId);
    const original = nodeMap.get(nodeId);
    const width = original?.width || DEFAULT_NODE_WIDTH;
    const height = original?.height || DEFAULT_NODE_HEIGHT;

    const childEdges = getChildEdges(nodeId, edges);
    const children: LayoutNode[] = [];

    for (const edge of childEdges) {
      if (!visited.has(edge.targetNodeId) && nodeMap.has(edge.targetNodeId)) {
        children.push(buildHierarchy(edge.targetNodeId));
      }
    }

    return {
      id: nodeId,
      width,
      height,
      children,
      x: 0,
      y: 0,
      treeBreadth: 0,
    };
  }

  const layoutRoots: LayoutNode[] = [];
  for (const root of roots) {
    if (!visited.has(root.id)) {
      layoutRoots.push(buildHierarchy(root.id));
    }
  }

  // Also include any disconnected nodes
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      layoutRoots.push(buildHierarchy(node.id));
    }
  }

  const updatedPositions = new Map<string, { x: number; y: number }>();

  if (direction === 'TB') {
    // TOP TO BOTTOM LAYOUT
    let currentRootOffset = 80;

    for (const root of layoutRoots) {
      // Step 1: Calculate breadth of each subtree
      computeBreadthTB(root);

      // Step 2: Assign coordinates
      positionSubtreeTB(root, currentRootOffset, 80);

      currentRootOffset += root.treeBreadth + SIBLING_SPACING * 2;
    }
  } else if (direction === 'LR') {
    // LEFT TO RIGHT LAYOUT
    let currentRootOffset = 80;

    for (const root of layoutRoots) {
      computeBreadthLR(root);
      positionSubtreeLR(root, 80, currentRootOffset);
      currentRootOffset += root.treeBreadth + SIBLING_SPACING * 2;
    }
  } else {
    // RIGHT TO LEFT LAYOUT (RL)
    // Find max depth to start root at right side
    let currentRootOffset = 80;

    for (const root of layoutRoots) {
      computeBreadthLR(root);
      const maxDepth = computeMaxDepth(root);
      const startX = 80 + maxDepth * (DEFAULT_NODE_WIDTH + LEVEL_SPACING);
      positionSubtreeRL(root, startX, currentRootOffset);
      currentRootOffset += root.treeBreadth + SIBLING_SPACING * 2;
    }
  }

  function collectPositions(layoutNode: LayoutNode) {
    updatedPositions.set(layoutNode.id, { x: Math.round(layoutNode.x), y: Math.round(layoutNode.y) });
    for (const child of layoutNode.children) {
      collectPositions(child);
    }
  }

  for (const root of layoutRoots) {
    collectPositions(root);
  }

  // Return new array of nodes with formatted coordinates
  return nodes.map(node => {
    const pos = updatedPositions.get(node.id);
    if (pos) {
      return {
        ...node,
        x: pos.x,
        y: pos.y,
      };
    }
    return node;
  });
}

// -------------------------------------------------------------
// Top-to-Bottom (TB) Helpers
// -------------------------------------------------------------
function computeBreadthTB(node: LayoutNode): number {
  if (node.children.length === 0) {
    node.treeBreadth = node.width;
    return node.treeBreadth;
  }

  let totalChildBreadth = 0;
  for (let i = 0; i < node.children.length; i++) {
    const childBreadth = computeBreadthTB(node.children[i]);
    totalChildBreadth += childBreadth;
    if (i > 0) {
      totalChildBreadth += SIBLING_SPACING;
    }
  }

  node.treeBreadth = Math.max(node.width, totalChildBreadth);
  return node.treeBreadth;
}

function positionSubtreeTB(node: LayoutNode, leftBoundary: number, currentY: number) {
  node.y = currentY;

  if (node.children.length === 0) {
    node.x = leftBoundary;
    return;
  }

  let childLeft = leftBoundary;
  // If parent width is larger than total children breadth, center children below parent
  let totalChildrenWidth = 0;
  node.children.forEach((c, idx) => {
    totalChildrenWidth += c.treeBreadth;
    if (idx > 0) totalChildrenWidth += SIBLING_SPACING;
  });

  if (node.treeBreadth > totalChildrenWidth) {
    childLeft += (node.treeBreadth - totalChildrenWidth) / 2;
  }

  const childXPositions: number[] = [];

  for (const child of node.children) {
    positionSubtreeTB(child, childLeft, currentY + node.height + LEVEL_SPACING);
    childXPositions.push(child.x + child.width / 2);
    childLeft += child.treeBreadth + SIBLING_SPACING;
  }

  // Center parent over children centers
  if (childXPositions.length > 0) {
    const minChildCenter = childXPositions[0];
    const maxChildCenter = childXPositions[childXPositions.length - 1];
    const midPoint = (minChildCenter + maxChildCenter) / 2;
    node.x = midPoint - node.width / 2;
  } else {
    node.x = leftBoundary + (node.treeBreadth - node.width) / 2;
  }
}

// -------------------------------------------------------------
// Left-to-Right (LR) Helpers
// -------------------------------------------------------------
function computeBreadthLR(node: LayoutNode): number {
  if (node.children.length === 0) {
    node.treeBreadth = node.height;
    return node.treeBreadth;
  }

  let totalChildBreadth = 0;
  for (let i = 0; i < node.children.length; i++) {
    const childBreadth = computeBreadthLR(node.children[i]);
    totalChildBreadth += childBreadth;
    if (i > 0) {
      totalChildBreadth += SIBLING_SPACING;
    }
  }

  node.treeBreadth = Math.max(node.height, totalChildBreadth);
  return node.treeBreadth;
}

function positionSubtreeLR(node: LayoutNode, currentX: number, topBoundary: number) {
  node.x = currentX;

  if (node.children.length === 0) {
    node.y = topBoundary;
    return;
  }

  let childTop = topBoundary;
  let totalChildrenHeight = 0;
  node.children.forEach((c, idx) => {
    totalChildrenHeight += c.treeBreadth;
    if (idx > 0) totalChildrenHeight += SIBLING_SPACING;
  });

  if (node.treeBreadth > totalChildrenHeight) {
    childTop += (node.treeBreadth - totalChildrenHeight) / 2;
  }

  const childYPositions: number[] = [];

  for (const child of node.children) {
    positionSubtreeLR(child, currentX + node.width + LEVEL_SPACING, childTop);
    childYPositions.push(child.y + child.height / 2);
    childTop += child.treeBreadth + SIBLING_SPACING;
  }

  if (childYPositions.length > 0) {
    const minChildCenter = childYPositions[0];
    const maxChildCenter = childYPositions[childYPositions.length - 1];
    const midPoint = (minChildCenter + maxChildCenter) / 2;
    node.y = midPoint - node.height / 2;
  } else {
    node.y = topBoundary + (node.treeBreadth - node.height) / 2;
  }
}

// -------------------------------------------------------------
// Right-to-Left (RL) Helpers
// -------------------------------------------------------------
function positionSubtreeRL(node: LayoutNode, currentX: number, topBoundary: number) {
  node.x = currentX;

  if (node.children.length === 0) {
    node.y = topBoundary;
    return;
  }

  let childTop = topBoundary;
  let totalChildrenHeight = 0;
  node.children.forEach((c, idx) => {
    totalChildrenHeight += c.treeBreadth;
    if (idx > 0) totalChildrenHeight += SIBLING_SPACING;
  });

  if (node.treeBreadth > totalChildrenHeight) {
    childTop += (node.treeBreadth - totalChildrenHeight) / 2;
  }

  const childYPositions: number[] = [];

  for (const child of node.children) {
    positionSubtreeRL(child, currentX - (child.width + LEVEL_SPACING), childTop);
    childYPositions.push(child.y + child.height / 2);
    childTop += child.treeBreadth + SIBLING_SPACING;
  }

  if (childYPositions.length > 0) {
    const minChildCenter = childYPositions[0];
    const maxChildCenter = childYPositions[childYPositions.length - 1];
    const midPoint = (minChildCenter + maxChildCenter) / 2;
    node.y = midPoint - node.height / 2;
  } else {
    node.y = topBoundary + (node.treeBreadth - node.height) / 2;
  }
}

function computeMaxDepth(node: LayoutNode): number {
  if (node.children.length === 0) return 0;
  let maxChild = 0;
  for (const child of node.children) {
    maxChild = Math.max(maxChild, computeMaxDepth(child));
  }
  return 1 + maxChild;
}
