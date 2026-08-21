import { TreeData, TreeNode, TreeEdge, SubtreeClipboard, ExportFormat, GrowthDirection } from '../types/tree';

export const EXPORT_SIGNATURE = 'DECISION_TREE_STUDIO_EXPORT_V1';
export const EXPORT_SIGNATURE_HEADER = '### DECISION TREE STUDIO EXPORT V1 ###';

export function generateId(prefix: string = 'node'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Determine dynamic role of a node purely from graph connections
 */
export function getNodeRole(
  nodeId: string,
  edges: TreeEdge[]
): 'root' | 'branch' | 'outcome' | 'isolated' {
  const incoming = edges.filter(e => e.targetNodeId === nodeId).length;
  const outgoing = edges.filter(e => e.sourceNodeId === nodeId).length;

  if (incoming === 0 && outgoing > 0) return 'root';
  if (incoming > 0 && outgoing > 0) return 'branch';
  if (incoming > 0 && outgoing === 0) return 'outcome';
  return 'isolated';
}

/**
 * Find root nodes (nodes without incoming edges or marked as isRoot)
 */
export function findRootNodes(nodes: TreeNode[], edges: TreeEdge[]): TreeNode[] {
  const targetIds = new Set(edges.map(e => e.targetNodeId));
  const roots = nodes.filter(n => !targetIds.has(n.id) || n.isRoot);
  if (roots.length === 0 && nodes.length > 0) {
    return [nodes[0]];
  }
  return roots;
}

/**
 * Get all immediate children of a node with their connecting edges
 */
export function getChildEdges(nodeId: string, edges: TreeEdge[]): TreeEdge[] {
  return edges.filter(e => e.sourceNodeId === nodeId);
}

/**
 * Get all immediate parent edges of a node
 */
export function getParentEdges(nodeId: string, edges: TreeEdge[]): TreeEdge[] {
  return edges.filter(e => e.targetNodeId === nodeId);
}

/**
 * Recursively get all descendant node IDs of a node
 */
export function getDescendantNodeIds(nodeId: string, edges: TreeEdge[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outgoing = edges.filter(e => e.sourceNodeId === current);
    for (const edge of outgoing) {
      if (!descendants.has(edge.targetNodeId) && edge.targetNodeId !== nodeId) {
        descendants.add(edge.targetNodeId);
        queue.push(edge.targetNodeId);
      }
    }
  }

  return descendants;
}

/**
 * Check if adding an edge from source to target would create a cycle
 */
export function wouldCreateCycle(sourceId: string, targetId: string, edges: TreeEdge[]): boolean {
  if (sourceId === targetId) return true;
  // If source is already a descendant of target, connecting source -> target creates a cycle
  const targetDescendants = getDescendantNodeIds(targetId, edges);
  return targetDescendants.has(sourceId);
}

/**
 * Determine which nodes are hidden due to any ancestor being collapsed
 */
export function getHiddenNodeIds(nodes: TreeNode[], edges: TreeEdge[]): Set<string> {
  const hidden = new Set<string>();
  const collapsedNodes = nodes.filter(n => n.isCollapsed);

  for (const collapsed of collapsedNodes) {
    const descendants = getDescendantNodeIds(collapsed.id, edges);
    descendants.forEach(id => hidden.add(id));
  }

  return hidden;
}

/**
 * Copy a single subtree starting from a given node
 */
export function extractSubtree(nodeId: string, nodes: TreeNode[], edges: TreeEdge[]): SubtreeClipboard | null {
  const rootNode = nodes.find(n => n.id === nodeId);
  if (!rootNode) return null;

  const descendantIds = getDescendantNodeIds(nodeId, edges);
  const allSubtreeNodeIds = new Set([nodeId, ...descendantIds]);

  const subtreeNodes = nodes.filter(n => allSubtreeNodeIds.has(n.id));
  const subtreeEdges = edges.filter(e => allSubtreeNodeIds.has(e.sourceNodeId) && allSubtreeNodeIds.has(e.targetNodeId));

  return {
    rootId: nodeId,
    nodes: JSON.parse(JSON.stringify(subtreeNodes)),
    edges: JSON.parse(JSON.stringify(subtreeEdges)),
    copiedAt: Date.now(),
  };
}

/**
 * Copy multiple selected nodes and all edges between them
 */
export function extractSelectedNodes(
  selectedNodeIds: string[],
  nodes: TreeNode[],
  edges: TreeEdge[]
): SubtreeClipboard | null {
  if (selectedNodeIds.length === 0) return null;

  const selectedSet = new Set(selectedNodeIds);
  const selectedNodes = nodes.filter(n => selectedSet.has(n.id));
  if (selectedNodes.length === 0) return null;

  const selectedEdges = edges.filter(
    e => selectedSet.has(e.sourceNodeId) && selectedSet.has(e.targetNodeId)
  );

  return {
    rootId: selectedNodes[0].id,
    nodes: JSON.parse(JSON.stringify(selectedNodes)),
    edges: JSON.parse(JSON.stringify(selectedEdges)),
    copiedAt: Date.now(),
  };
}

/**
 * Paste a subtree / multi-node selection with new IDs at target coordinates
 */
export function instantiateSubtree(
  clipboard: SubtreeClipboard,
  targetPos: { x: number; y: number }
): { newNodes: TreeNode[]; newEdges: TreeEdge[]; newRootId: string } {
  const idMap = new Map<string, string>();

  // Map old IDs to fresh IDs
  clipboard.nodes.forEach(node => {
    idMap.set(node.id, generateId('node'));
  });

  // Calculate bounding center of copied nodes to position around targetPos
  const minX = Math.min(...clipboard.nodes.map(n => n.x));
  const minY = Math.min(...clipboard.nodes.map(n => n.y));
  const deltaX = targetPos.x - minX;
  const deltaY = targetPos.y - minY;

  const newNodes: TreeNode[] = clipboard.nodes.map(node => {
    const newId = idMap.get(node.id)!;
    return {
      ...node,
      id: newId,
      x: Math.round(node.x + deltaX),
      y: Math.round(node.y + deltaY),
      isRoot: false,
    };
  });

  const newEdges: TreeEdge[] = clipboard.edges
    .map(edge => {
      const newSource = idMap.get(edge.sourceNodeId);
      const newTarget = idMap.get(edge.targetNodeId);
      if (!newSource || !newTarget) return null;
      return {
        ...edge,
        id: generateId('edge'),
        sourceNodeId: newSource,
        targetNodeId: newTarget,
      };
    })
    .filter((e): e is TreeEdge => e !== null);

  const newRootId = (clipboard.rootId && idMap.get(clipboard.rootId)) || newNodes[0].id;

  return { newNodes, newEdges, newRootId };
}

/**
 * Export tree in various text formats with studio signatures
 */
export function exportTreeText(tree: TreeData, format: ExportFormat): string {
  switch (format) {
    case 'outline':
      return generateOutlineText(tree);
    case 'markdown':
      return generateMarkdownText(tree);
    case 'mermaid':
      return generateMermaidText(tree);
    case 'paths':
      return generateDecisionPathsText(tree);
    case 'yaml':
      return generateYamlText(tree);
    case 'json':
    default:
      return JSON.stringify(
        {
          ...tree,
          exportSignature: EXPORT_SIGNATURE,
          version: '1.0',
        },
        null,
        2
      );
  }
}

/**
 * Generate human-readable hierarchical outline
 */
function generateOutlineText(tree: TreeData): string {
  const roots = findRootNodes(tree.nodes, tree.edges);
  const lines: string[] = [];

  lines.push(EXPORT_SIGNATURE_HEADER);
  lines.push(`# Format: Outline | Name: "${tree.name}" | Direction: ${tree.growthDirection} | Version: 1.0\n`);
  lines.push(`=== ${tree.name.toUpperCase()} (Growth: ${tree.growthDirection}) ===\n`);

  if (roots.length === 0) {
    lines.push('Empty Tree');
    return lines.join('\n');
  }

  function traverse(nodeId: string, prefix: string, isLastChild: boolean, answerFromParent?: string) {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const role = getNodeRole(nodeId, tree.edges);
    const roleTag = role === 'outcome' ? '[OUTCOME]' : role === 'root' ? '[ROOT]' : '[QUESTION]';
    const answerPrefix = answerFromParent ? `[Answer: "${answerFromParent}"] ──► ` : '';
    const currentLine = `${prefix}${isLastChild ? '└── ' : '├── '}${answerPrefix}${roleTag} ${node.question}`;
    lines.push(currentLine);

    if (node.description) {
      const indent = prefix + (isLastChild ? '    ' : '│   ');
      lines.push(`${indent}ℹ ${node.description}`);
    }

    const childEdges = getChildEdges(nodeId, tree.edges);
    const childPrefix = prefix + (isLastChild ? '    ' : '│   ');

    childEdges.forEach((edge, idx) => {
      const isLast = idx === childEdges.length - 1;
      traverse(edge.targetNodeId, childPrefix, isLast, edge.answer);
    });
  }

  roots.forEach((root, idx) => {
    lines.push(`TREE #${idx + 1}: ${root.question}`);
    if (root.description) lines.push(`  Description: ${root.description}`);

    const childEdges = getChildEdges(root.id, tree.edges);
    childEdges.forEach((edge, cIdx) => {
      const isLast = cIdx === childEdges.length - 1;
      traverse(edge.targetNodeId, '  ', isLast, edge.answer);
    });
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Generate Markdown Nested List
 */
function generateMarkdownText(tree: TreeData): string {
  const roots = findRootNodes(tree.nodes, tree.edges);
  const lines: string[] = [];

  lines.push(`<!-- ${EXPORT_SIGNATURE_HEADER} format:markdown direction:${tree.growthDirection} -->\n`);
  lines.push(`# ${tree.name}\n`);

  function traverse(nodeId: string, depth: number, answerFromParent?: string) {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const role = getNodeRole(nodeId, tree.edges);
    const indent = '  '.repeat(depth);
    const answerBadge = answerFromParent ? `**[Answer: ${answerFromParent}]** ` : '';
    const typeBadge = role === 'outcome' ? '🎯 **Outcome:** ' : role === 'root' ? '🏁 **Start:** ' : '❓ **Question:** ';
    lines.push(`${indent}- ${answerBadge}${typeBadge}${node.question}`);

    if (node.description) {
      lines.push(`${indent}  > ${node.description}`);
    }

    const childEdges = getChildEdges(nodeId, tree.edges);
    childEdges.forEach(edge => {
      traverse(edge.targetNodeId, depth + 1, edge.answer);
    });
  }

  roots.forEach(root => {
    traverse(root.id, 0);
  });

  return lines.join('\n');
}

/**
 * Generate Mermaid Flowchart
 */
function generateMermaidText(tree: TreeData): string {
  const directionMap = {
    TB: 'TD',
    LR: 'LR',
    RL: 'RL',
  };
  const dir = directionMap[tree.growthDirection] || 'TD';
  const lines: string[] = [
    `%% ${EXPORT_SIGNATURE_HEADER} format:mermaid %%`,
    `graph ${dir}`,
  ];

  // Define nodes
  tree.nodes.forEach(node => {
    const cleanText = (node.question || 'Node').replace(/["\n\r]/g, ' ');
    const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const role = getNodeRole(node.id, tree.edges);
    if (role === 'outcome') {
      lines.push(`  ${safeId}(["🎯 ${cleanText}"])`);
    } else {
      lines.push(`  ${safeId}["❓ ${cleanText}"]`);
    }
  });

  // Define edges with answers
  tree.edges.forEach(edge => {
    const sourceSafe = edge.sourceNodeId.replace(/[^a-zA-Z0-9_]/g, '_');
    const targetSafe = edge.targetNodeId.replace(/[^a-zA-Z0-9_]/g, '_');
    const cleanAnswer = (edge.answer || 'Next').replace(/["\n\r]/g, ' ');
    lines.push(`  ${sourceSafe} -->|"${cleanAnswer}"| ${targetSafe}`);
  });

  return lines.join('\n');
}

/**
 * Generate List of all decision pathways (Root -> Leaf)
 */
function generateDecisionPathsText(tree: TreeData): string {
  const roots = findRootNodes(tree.nodes, tree.edges);
  const paths: string[] = [];

  function findPaths(nodeId: string, currentPath: { q: string; a?: string; role: string }[]) {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const childEdges = getChildEdges(nodeId, tree.edges);

    if (childEdges.length === 0) {
      // Leaf node reached
      const pathString = currentPath
        .map((step, i) => {
          if (i === 0) return `[Start: "${step.q}"]`;
          return `──► (Answer: "${step.a}") ──► [${step.role === 'outcome' ? 'Outcome' : 'Step'}: "${step.q}"]`;
        })
        .join(' ');
      paths.push(pathString);
      return;
    }

    for (const edge of childEdges) {
      const targetNode = tree.nodes.find(n => n.id === edge.targetNodeId);
      if (targetNode) {
        findPaths(edge.targetNodeId, [
          ...currentPath,
          { q: targetNode.question, a: edge.answer, role: getNodeRole(targetNode.id, tree.edges) },
        ]);
      }
    }
  }

  roots.forEach(root => {
    findPaths(root.id, [{ q: root.question, role: getNodeRole(root.id, tree.edges) }]);
  });

  return [
    EXPORT_SIGNATURE_HEADER,
    `=== DECISION PATHS & OUTCOMES (${paths.length} Total Paths) ===\n`,
    ...paths.map((p, i) => `Path #${i + 1}:\n${p}\n`),
  ].join('\n');
}

/**
 * Generate YAML Tree representation
 */
function generateYamlText(tree: TreeData): string {
  const roots = findRootNodes(tree.nodes, tree.edges);

  function nodeToYaml(nodeId: string, indentLevel: number): string {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return '';

    const role = getNodeRole(nodeId, tree.edges);
    const indent = '  '.repeat(indentLevel);
    let output = `${indent}- question: "${(node.question || '').replace(/"/g, '\\"')}"\n`;
    output += `${indent}  role: "${role}"\n`;
    if (node.description) {
      output += `${indent}  description: "${node.description.replace(/"/g, '\\"')}"\n`;
    }

    const childEdges = getChildEdges(nodeId, tree.edges);
    if (childEdges.length > 0) {
      output += `${indent}  branches:\n`;
      for (const edge of childEdges) {
        output += `${indent}    - answer: "${(edge.answer || '').replace(/"/g, '\\"')}"\n`;
        output += `${indent}      target:\n`;
        output += nodeToYaml(edge.targetNodeId, indentLevel + 4);
      }
    }

    return output;
  }

  let yaml = `# ${EXPORT_SIGNATURE_HEADER}\nname: "${tree.name}"\ngrowthDirection: "${tree.growthDirection}"\ntrees:\n`;
  for (const root of roots) {
    yaml += nodeToYaml(root.id, 1);
  }
  return yaml;
}

/**
 * Calculate SVG curved path and label center for connecting two tree nodes
 */
export function calculateEdgePath(
  sourceNode: TreeNode,
  targetNode: TreeNode,
  growthDirection: GrowthDirection = 'TB'
): { path: string; labelX: number; labelY: number; angle: number } {
  const sw = sourceNode.width || 220;
  const sh = sourceNode.height || 110;
  const tw = targetNode.width || 220;
  const th = targetNode.height || 110;

  let sx = sourceNode.x;
  let sy = sourceNode.y;
  let tx = targetNode.x;
  let ty = targetNode.y;

  let c1x = sx;
  let c1y = sy;
  let c2x = tx;
  let c2y = ty;

  if (growthDirection === 'TB') {
    sx = sourceNode.x + sw / 2;
    sy = sourceNode.y + sh;
    tx = targetNode.x + tw / 2;
    ty = targetNode.y;

    const deltaY = Math.max(Math.abs(ty - sy) * 0.5, 40);
    c1x = sx;
    c1y = sy + deltaY;
    c2x = tx;
    c2y = ty - deltaY;
  } else if (growthDirection === 'LR') {
    sx = sourceNode.x + sw;
    sy = sourceNode.y + sh / 2;
    tx = targetNode.x;
    ty = targetNode.y + th / 2;

    const deltaX = Math.max(Math.abs(tx - sx) * 0.5, 40);
    c1x = sx + deltaX;
    c1y = sy;
    c2x = tx - deltaX;
    c2y = ty;
  } else {
    // RL: Right to Left
    sx = sourceNode.x;
    sy = sourceNode.y + sh / 2;
    tx = targetNode.x + tw;
    ty = targetNode.y + th / 2;

    const deltaX = Math.max(Math.abs(sx - tx) * 0.5, 40);
    c1x = sx - deltaX;
    c1y = sy;
    c2x = tx + deltaX;
    c2y = ty;
  }

  const path = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;

  // Evaluate cubic bezier at t=0.5 for label position
  const t = 0.5;
  const omt = 1 - t;
  const labelX =
    omt * omt * omt * sx +
    3 * omt * omt * t * c1x +
    3 * omt * t * t * c2x +
    t * t * t * tx;
  const labelY =
    omt * omt * omt * sy +
    3 * omt * omt * t * c1y +
    3 * omt * t * t * c2y +
    t * t * t * ty;

  const dx = tx - sx;
  const dy = ty - sy;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

  return { path, labelX, labelY, angle };
}

/**
 * Validate and parse an imported text or JSON file.
 * STRICT: Only accepts files exported by Decision Tree Studio!
 */
export function validateAndParseImport(
  fileContent: string
): { success: boolean; tree?: TreeData; error?: string } {
  const content = fileContent.trim();
  if (!content) {
    return {
      success: false,
      error: 'The uploaded file is empty.',
    };
  }

  // 1. Try parsing as JSON (either raw JSON or studio JSON export)
  if (content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content);
      // Check if it's our schema
      const isOurSchema =
        Array.isArray(parsed.nodes) &&
        (parsed.exportSignature === EXPORT_SIGNATURE ||
          parsed.growthDirection !== undefined ||
          Array.isArray(parsed.edges));

      if (!isOurSchema) {
        return {
          success: false,
          error:
            'Import rejected: This JSON file does not conform to the Decision Tree Studio structure or was not exported by this application.',
        };
      }

      const nodes: TreeNode[] = (parsed.nodes || []).map((n: any) => ({
        id: n.id || generateId('node'),
        question: n.question || 'Untitled Node',
        description: n.description || '',
        x: typeof n.x === 'number' ? n.x : 0,
        y: typeof n.y === 'number' ? n.y : 0,
        width: n.width || 220,
        height: n.height || 110,
        isRoot: Boolean(n.isRoot),
        color: n.color || '#3b82f6',
        isCollapsed: Boolean(n.isCollapsed),
      }));

      const edges: TreeEdge[] = (parsed.edges || []).map((e: any) => ({
        id: e.id || generateId('edge'),
        sourceNodeId: e.sourceNodeId,
        targetNodeId: e.targetNodeId,
        answer: e.answer || 'Next',
        description: e.description || '',
      }));

      return {
        success: true,
        tree: {
          id: parsed.id || `tree_${Date.now()}`,
          name: parsed.name || 'Imported Decision Tree',
          growthDirection: parsed.growthDirection || 'TB',
          nodes,
          edges,
        },
      };
    } catch {
      return {
        success: false,
        error: 'Invalid JSON syntax. Please provide a valid Decision Tree Studio JSON export.',
      };
    }
  }

  // 2. Text Outline / Markdown / YAML parsing with signature verification
  const hasStudioSignature =
    content.includes(EXPORT_SIGNATURE_HEADER) ||
    content.includes('DECISION TREE STUDIO EXPORT') ||
    content.includes(EXPORT_SIGNATURE);

  if (!hasStudioSignature) {
    return {
      success: false,
      error:
        'Import rejected: This file was not exported by Decision Tree Studio (missing required studio signature). Only files created and exported by this application can be imported.',
    };
  }

  // Parse Text Outline format exported by Decision Tree Studio
  try {
    const lines = content.split('\n');
    let treeName = 'Imported Decision Tree';
    let growthDirection: GrowthDirection = 'TB';

    // Parse header metadata if present
    for (const line of lines) {
      const nameMatch = line.match(/Name:\s*"([^"]+)"/i) || line.match(/===\s*(.+?)\s*\(Growth:/i);
      if (nameMatch && nameMatch[1]) {
        treeName = nameMatch[1].trim();
      }
      const dirMatch = line.match(/Direction:\s*(TB|LR|RL)/i) || line.match(/Growth:\s*(TB|LR|RL)/i);
      if (dirMatch && dirMatch[1]) {
        growthDirection = dirMatch[1] as GrowthDirection;
      }
    }

    const nodes: TreeNode[] = [];
    const edges: TreeEdge[] = [];

    // Parse tree nodes and branches from outline / markdown
    interface StackItem {
      nodeId: string;
      indent: number;
    }
    const stack: StackItem[] = [];

    let currentRoot: TreeNode | null = null;
    let nodeCounter = 0;

    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('===') || line.startsWith('<!--') || line.startsWith('%%') || !line.trim()) {
        continue;
      }

      // Check for TREE #1 root declaration
      const rootMatch = line.match(/^TREE\s*#\d+:\s*(.+)$/i);
      if (rootMatch) {
        const question = rootMatch[1].trim();
        const rootNode: TreeNode = {
          id: generateId('node'),
          question,
          x: 100 + nodes.length * 300,
          y: 100,
          width: 220,
          height: 110,
          isRoot: true,
          color: '#3b82f6',
        };
        nodes.push(rootNode);
        currentRoot = rootNode;
        stack.length = 0;
        stack.push({ nodeId: rootNode.id, indent: 0 });
        continue;
      }

      // Check for hierarchical branch line (e.g. ├── [Answer: "Yes"] ──► [QUESTION] Text)
      const branchMatch = line.match(/^(\s*)([├└]──\s*)?(?:\[Answer:\s*"([^"]+)"\]\s*──►\s*)?(?:\[(ROOT|QUESTION|OUTCOME)\]\s*)?(.+)$/);
      if (branchMatch) {
        const leadingWhitespace = branchMatch[1] || '';
        const answer = branchMatch[3] || 'Next';
        const question = (branchMatch[5] || '').trim();

        if (question.startsWith('ℹ') || question.startsWith('Description:')) {
          // Description subtext for previous node
          if (nodes.length > 0) {
            const desc = question.replace(/^(ℹ|Description:)\s*/, '');
            nodes[nodes.length - 1].description = desc;
          }
          continue;
        }

        const indent = leadingWhitespace.length;
        const newNode: TreeNode = {
          id: generateId('node'),
          question,
          x: 100 + (indent / 2) * 260,
          y: 100 + nodeCounter * 80,
          width: 220,
          height: 110,
          color: '#3b82f6',
        };
        nodes.push(newNode);
        nodeCounter++;

        // Find parent on stack with smaller indent
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }

        const parent = stack.length > 0 ? stack[stack.length - 1] : (currentRoot ? { nodeId: currentRoot.id, indent: -1 } : null);
        if (parent) {
          edges.push({
            id: generateId('edge'),
            sourceNodeId: parent.nodeId,
            targetNodeId: newNode.id,
            answer,
          });
        }

        stack.push({ nodeId: newNode.id, indent });
      }
    }

    if (nodes.length === 0) {
      return {
        success: false,
        error: 'No valid decision tree structure found inside the exported file.',
      };
    }

    return {
      success: true,
      tree: {
        id: `tree_${Date.now()}`,
        name: treeName,
        growthDirection,
        nodes,
        edges,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse Decision Tree Studio file: ${err.message || err}`,
    };
  }
}

