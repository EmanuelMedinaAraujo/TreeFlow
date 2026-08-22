import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sampleTrees } from './sampleTrees';
import { 
  exportTreeText, 
  validateAndParseImport, 
  getNodeRole, 
  getTreeMetrics,
  findRootNodes,
  getChildEdges,
  getParentEdges,
  getDescendantNodeIds,
  wouldCreateCycle,
  getHiddenNodeIds,
  extractSubtree,
  extractSelectedNodes,
  instantiateSubtree,
  calculateEdgePath,
  generateId
} from './treeUtils';
import { formatTreeLayout } from './treeLayout';
import { TreeData, TreeNode, TreeEdge } from '../types/tree';

function verifyGraphEquivalence(orig: TreeData, imported: TreeData, label: string) {
  // 1. Check Node count
  assert.strictEqual(
    imported.nodes.length,
    orig.nodes.length,
    `[${label}] Expected ${orig.nodes.length} nodes, got ${imported.nodes.length}`
  );

  // 2. Check Edge count
  assert.strictEqual(
    imported.edges.length,
    orig.edges.length,
    `[${label}] Expected ${orig.edges.length} edges, got ${imported.edges.length}`
  );

  // 3. Check Questions exist
  const impNodesByQ = new Map(imported.nodes.map(n => [n.question, n]));
  for (const n of orig.nodes) {
    const imp = impNodesByQ.get(n.question);
    assert.ok(imp, `[${label}] Node with question "${n.question}" not found in imported graph`);
  }

  // 4. Check Graph Topology (all parent->child branch answers)
  const origNodeMap = new Map(orig.nodes.map(n => [n.id, n]));
  const impNodeMap = new Map(imported.nodes.map(n => [n.id, n]));

  const origEdges = orig.edges.map(e => ({
    srcQ: origNodeMap.get(e.sourceNodeId)?.question || '',
    tgtQ: origNodeMap.get(e.targetNodeId)?.question || '',
    answer: e.answer,
  }));

  const impEdges = imported.edges.map(e => ({
    srcQ: impNodeMap.get(e.sourceNodeId)?.question || '',
    tgtQ: impNodeMap.get(e.targetNodeId)?.question || '',
    answer: e.answer,
  }));

  for (const o of origEdges) {
    const match = impEdges.find(
      i =>
        i.srcQ === o.srcQ &&
        i.tgtQ === o.tgtQ &&
        (i.answer === o.answer || i.answer.toLowerCase() === o.answer.toLowerCase())
    );
    assert.ok(
      match,
      `[${label}] Missing edge connection from "${o.srcQ}" to "${o.tgtQ}" with answer "${o.answer}"`
    );
  }
}

describe('Export and Import Graph Equivalence', () => {
  const formats = ['json', 'outline', 'markdown', 'yaml', 'mermaid', 'paths'] as const;

  for (const [key, tree] of Object.entries(sampleTrees)) {
    describe(`Sample Tree: ${key} (${tree.nodes.length} nodes, ${tree.edges.length} edges)`, () => {
      for (const format of formats) {
        it(`should roundtrip ${format} format resulting in the exact same graph topology`, () => {
          const exported = exportTreeText(tree, format);
          assert.ok(exported && exported.length > 0, `Exported ${format} string should not be empty`);

          const result = validateAndParseImport(exported);
          assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
          assert.ok(result.tree, `Parsed tree should exist for ${format}`);

          verifyGraphEquivalence(tree, result.tree, `${key} -> ${format}`);
        });
      }
    });
  }

  describe('Deeply Nested Multi-Branch Tree (5+ levels of nesting)', () => {
    const deepTree: TreeData = {
      id: 'deep_tree_test',
      name: 'Complex Deep Diagnostic Architecture',
      growthDirection: 'TB',
      nodes: [
        { id: 'n0', question: 'Level 0 Root Query', description: 'Root Diagnostic Details', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 'n1_1', question: 'Level 1 Branch Alpha', description: 'Alpha Desc', x: 0, y: 0, type: 'question' },
        { id: 'n1_2', question: 'Level 1 Branch Beta', description: 'Beta Desc', x: 0, y: 0, type: 'decision' },
        { id: 'n2_1', question: 'Level 2 Nested Step A', description: 'Step A Desc', x: 0, y: 0, type: 'question' },
        { id: 'n2_2', question: 'Level 2 Outcome Fast', description: 'Fast Exit Desc', x: 0, y: 0, type: 'outcome' },
        { id: 'n3_1', question: 'Level 3 Deep Decision Point', description: 'L3 Evaluation', x: 0, y: 0, type: 'question' },
        { id: 'n4_1', question: 'Level 4 Critical Verification', description: 'L4 Check', x: 0, y: 0, type: 'question' },
        { id: 'n5_1', question: 'Level 5 Final Success Outcome', description: 'Resolved 100%', x: 0, y: 0, type: 'outcome' },
        { id: 'n5_2', question: 'Level 5 Final Escalation Outcome', description: 'Escalate to L3 Support', x: 0, y: 0, type: 'outcome' },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'n0', targetNodeId: 'n1_1', answer: 'Select Alpha' },
        { id: 'e2', sourceNodeId: 'n0', targetNodeId: 'n1_2', answer: 'Select Beta' },
        { id: 'e3', sourceNodeId: 'n1_1', targetNodeId: 'n2_1', answer: 'Go Deep' },
        { id: 'e4', sourceNodeId: 'n1_1', targetNodeId: 'n2_2', answer: 'Quick Terminate' },
        { id: 'e5', sourceNodeId: 'n2_1', targetNodeId: 'n3_1', answer: 'Continue Phase 3' },
        { id: 'e6', sourceNodeId: 'n3_1', targetNodeId: 'n4_1', answer: 'Verify Conditions' },
        { id: 'e7', sourceNodeId: 'n4_1', targetNodeId: 'n5_1', answer: 'All Passed' },
        { id: 'e8', sourceNodeId: 'n4_1', targetNodeId: 'n5_2', answer: 'Failed Check' },
      ],
    };

    for (const format of formats) {
      it(`should preserve deep nested graph topology across ${format} format`, () => {
        const exported = exportTreeText(deepTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree, `Parsed tree should exist for ${format}`);
        verifyGraphEquivalence(deepTree, result.tree, `deepTree -> ${format}`);
      });
    }

    it('should preserve node descriptions and types on JSON, Outline, Markdown, and YAML', () => {
      for (const format of ['json', 'outline', 'markdown', 'yaml'] as const) {
        const exported = exportTreeText(deepTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true);
        const impMap = new Map(result.tree!.nodes.map(n => [n.question, n]));

        for (const orig of deepTree.nodes) {
          const imp = impMap.get(orig.question)!;
          assert.strictEqual(
            imp.description,
            orig.description,
            `[${format}] Description mismatch for "${orig.question}": expected "${orig.description}", got "${imp.description}"`
          );
          assert.strictEqual(
            imp.type,
            orig.type,
            `[${format}] Type mismatch for "${orig.question}": expected "${orig.type}", got "${imp.type}"`
          );
        }
      }
    });
  });

  describe('Multi-Root Tree with Disconnected Components', () => {
    const multiRootTree: TreeData = {
      id: 'multi_root_tree',
      name: 'Multi-Tree Diagnostic Workspace',
      growthDirection: 'LR',
      nodes: [
        { id: 'r1', question: 'Primary Cluster Root', description: 'Main system', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 'c1', question: 'Cluster 1 Sub-decision', description: '', x: 0, y: 0, type: 'decision' },
        { id: 'o1', question: 'Cluster 1 Outcome', description: 'Finish 1', x: 0, y: 0, type: 'outcome' },
        { id: 'r2', question: 'Secondary Standalone Root', description: 'Backup system', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 'o2', question: 'Secondary Outcome', description: 'Finish 2', x: 0, y: 0, type: 'outcome' },
      ],
      edges: [
        { id: 'e1', sourceNodeId: 'r1', targetNodeId: 'c1', answer: 'Process A' },
        { id: 'e2', sourceNodeId: 'c1', targetNodeId: 'o1', answer: 'Approve' },
        { id: 'e3', sourceNodeId: 'r2', targetNodeId: 'o2', answer: 'Activate Failover' },
      ],
    };

    for (const format of formats) {
      it(`should support multi-root trees in ${format} format`, () => {
        const exported = exportTreeText(multiRootTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree);
        verifyGraphEquivalence(multiRootTree, result.tree, `multiRoot -> ${format}`);
      });
    }
  });

  describe('Special Characters and Quotes Handling', () => {
    const specialTree: TreeData = {
      id: 'special_chars_tree',
      name: 'Special "Quotes" & Unicode 🚀 Tree',
      growthDirection: 'TB',
      nodes: [
        { id: 's0', question: 'Does device say "Ready, Set, Go"?', description: 'Note: (3 > 2) & [a, b]', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 's1', question: 'Action: Re-check "Power Cable" & USB-C', description: 'Check LEDs 💡 & connectors', x: 0, y: 0, type: 'outcome' },
      ],
      edges: [
        { id: 'se1', sourceNodeId: 's0', targetNodeId: 's1', answer: 'Yes, "OK" status confirmed' },
      ],
    };

    for (const format of formats) {
      it(`should handle special characters and quotes in ${format}`, () => {
        const exported = exportTreeText(specialTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree);
        verifyGraphEquivalence(specialTree, result.tree, `specialTree -> ${format}`);
      });
    }
  });

  describe('Dynamic Node Roles and Tree Metrics Calculation', () => {
    it('should calculate correct metrics for empty tree', () => {
      const metrics = getTreeMetrics([], []);
      assert.deepStrictEqual(metrics, {
        questionCount: 0,
        outcomeCount: 0,
        edgeCount: 0,
        totalNodeCount: 0,
      });
    });

    it('should classify isolated node as question (not outcome)', () => {
      const node: TreeNode = { id: 'n1', question: 'Isolated Step', x: 0, y: 0 };
      assert.strictEqual(getNodeRole('n1', []), 'isolated');
      const metrics = getTreeMetrics([node], []);
      assert.deepStrictEqual(metrics, {
        questionCount: 1,
        outcomeCount: 0,
        edgeCount: 0,
        totalNodeCount: 1,
      });
    });

    it('should correctly classify sample trees metrics', () => {
      // techSupport has 8 nodes (4 questions/branches/root, 4 terminal outcomes), 7 edges
      const metrics = getTreeMetrics(sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.strictEqual(metrics.questionCount, 4);
      assert.strictEqual(metrics.outcomeCount, 4);
      assert.strictEqual(metrics.edgeCount, 7);
      assert.strictEqual(metrics.totalNodeCount, 8);
    });

    it('should dynamically update terminal outcomes when nodes and branches are added', () => {
      const nodes: TreeNode[] = [
        { id: 'root', question: 'Root Question', x: 0, y: 0 },
        { id: 'leaf1', question: 'Outcome 1', x: 100, y: 100 },
      ];
      const edges: TreeEdge[] = [
        { id: 'e1', sourceNodeId: 'root', targetNodeId: 'leaf1', answer: 'Yes' },
      ];

      // 1 question (root), 1 outcome (leaf1)
      let metrics = getTreeMetrics(nodes, edges);
      assert.strictEqual(metrics.questionCount, 1);
      assert.strictEqual(metrics.outcomeCount, 1);
      assert.strictEqual(metrics.edgeCount, 1);

      // Add another outcome
      nodes.push({ id: 'leaf2', question: 'Outcome 2', x: 200, y: 100 });
      edges.push({ id: 'e2', sourceNodeId: 'root', targetNodeId: 'leaf2', answer: 'No' });

      metrics = getTreeMetrics(nodes, edges);
      assert.strictEqual(metrics.questionCount, 1);
      assert.strictEqual(metrics.outcomeCount, 2);
      assert.strictEqual(metrics.edgeCount, 2);
      assert.strictEqual(metrics.totalNodeCount, 3);

      // Turn leaf1 into a branching decision by adding a child
      nodes.push({ id: 'subLeaf', question: 'Deep Outcome', x: 100, y: 200 });
      edges.push({ id: 'e3', sourceNodeId: 'leaf1', targetNodeId: 'subLeaf', answer: 'Further check' });

      // Now: root (question), leaf1 (now branch question), leaf2 (outcome), subLeaf (outcome)
      metrics = getTreeMetrics(nodes, edges);
      assert.strictEqual(metrics.questionCount, 2);
      assert.strictEqual(metrics.outcomeCount, 2);
      assert.strictEqual(metrics.edgeCount, 3);
      assert.strictEqual(metrics.totalNodeCount, 4);

      // Delete the edge e3
      const edgesAfterDelete = edges.filter(e => e.id !== 'e3');
      metrics = getTreeMetrics(nodes, edgesAfterDelete);
      // leaf1 is outcome again, leaf2 is outcome, subLeaf is isolated (question)
      assert.strictEqual(metrics.outcomeCount, 2);
      assert.strictEqual(metrics.questionCount, 2);
      assert.strictEqual(metrics.edgeCount, 2);
    });

    it('should correctly classify multiple converging branches to same outcome', () => {
      const nodes: TreeNode[] = [
        { id: 'r1', question: 'Route A', x: 0, y: 0 },
        { id: 'r2', question: 'Route B', x: 100, y: 0 },
        { id: 'sharedOutcome', question: 'Common Solution', x: 50, y: 100 },
      ];
      const edges: TreeEdge[] = [
        { id: 'e1', sourceNodeId: 'r1', targetNodeId: 'sharedOutcome', answer: 'To Solution' },
        { id: 'e2', sourceNodeId: 'r2', targetNodeId: 'sharedOutcome', answer: 'Also To Solution' },
      ];

      assert.strictEqual(getNodeRole('sharedOutcome', edges), 'outcome');
      const metrics = getTreeMetrics(nodes, edges);
      assert.strictEqual(metrics.questionCount, 2);
      assert.strictEqual(metrics.outcomeCount, 1);
      assert.strictEqual(metrics.edgeCount, 2);
      assert.strictEqual(metrics.totalNodeCount, 3);
    });
  });

  describe('Isolated and Multi-Isolated Nodes Export/Import', () => {
    const singleIsolatedTree: TreeData = {
      id: 'single_isolated',
      name: 'Single Standalone Node Tree',
      growthDirection: 'TB',
      nodes: [
        { id: 'iso_root', question: 'Initial Standalone Discovery', description: 'No incoming or outgoing edges', x: 0, y: 0, isRoot: true, type: 'question' },
      ],
      edges: [],
    };

    for (const format of formats) {
      it(`should preserve single standalone node across ${format}`, () => {
        const exported = exportTreeText(singleIsolatedTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree);
        verifyGraphEquivalence(singleIsolatedTree, result.tree, `singleIsolated -> ${format}`);
      });
    }

    const multiIsolatedTree: TreeData = {
      id: 'multi_isolated',
      name: 'Multiple Disconnected Nodes Workspace',
      growthDirection: 'LR',
      nodes: [
        { id: 'iso_1', question: 'Component 1 Setup', description: 'Standalone 1', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 'iso_2', question: 'Component 2 Setup', description: 'Standalone 2', x: 0, y: 150, isRoot: true, type: 'question' },
        { id: 'iso_3', question: 'Component 3 Setup', description: 'Standalone 3', x: 0, y: 300, isRoot: true, type: 'decision' },
      ],
      edges: [],
    };

    for (const format of formats) {
      it(`should preserve multiple standalone nodes across ${format}`, () => {
        const exported = exportTreeText(multiIsolatedTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree);
        verifyGraphEquivalence(multiIsolatedTree, result.tree, `multiIsolated -> ${format}`);
      });
    }
  });

  describe('Internationalization & Complex Unicode Handling', () => {
    const i18nTree: TreeData = {
      id: 'i18n_test_tree',
      name: 'International 多语言 Диагностика & Emoji 🌟 Tree',
      growthDirection: 'RL',
      nodes: [
        { id: 'i18n_root', question: '¿Está encendido el dispositivo? 💻 (電源は入っていますか？)', description: 'Überprüfen Sie die Stromversorgung und LEDs ⚡️', x: 0, y: 0, isRoot: true, type: 'question' },
        { id: 'i18n_branch1', question: 'Vérifier la connexion réseau (5G / Wi-Fi 6) 🌐', description: 'Prüfung der Netzwerkverbindung und Signalstärke', x: 0, y: 0, type: 'decision' },
        { id: 'i18n_outcome1', question: 'Système opérationnel! 🚀 Все системы работают нормально.', description: 'Final OK: (100% ≥ 99.9% & α < β)', x: 0, y: 0, type: 'outcome' },
      ],
      edges: [
        { id: 'i18n_e1', sourceNodeId: 'i18n_root', targetNodeId: 'i18n_branch1', answer: 'Oui / はい (Signal > -70 dBm)' },
        { id: 'i18n_e2', sourceNodeId: 'i18n_branch1', targetNodeId: 'i18n_outcome1', answer: 'OK / 成功 (Latency < 20ms)' },
      ],
    };

    for (const format of formats) {
      it(`should preserve complex international unicode strings across ${format}`, () => {
        const exported = exportTreeText(i18nTree, format);
        const result = validateAndParseImport(exported);
        assert.strictEqual(result.success, true, `Failed to parse ${format}: ${result.error}`);
        assert.ok(result.tree);
        verifyGraphEquivalence(i18nTree, result.tree, `i18nTree -> ${format}`);
      });
    }
  });

  describe('Security and Import File Validation', () => {
    it('should reject empty file content', () => {
      const result = validateAndParseImport('');
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('empty'));
    });

    it('should reject whitespace-only file content', () => {
      const result = validateAndParseImport('   \n\t  \r\n  ');
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('empty'));
    });

    it('should reject foreign text files lacking studio signature', () => {
      const foreignText = 'This is an arbitrary text file downloaded from internet without studio signature.';
      const result = validateAndParseImport(foreignText);
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('signature') || result.error?.includes('rejected'));
    });

    it('should reject invalid JSON syntax gracefully', () => {
      const invalidJson = '{\n  "nodes": [\n    { "id": "n1", "question": "Unclosed...\n';
      const result = validateAndParseImport(invalidJson);
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Invalid JSON') || result.error?.includes('syntax'));
    });

    it('should reject non-conforming JSON objects', () => {
      const randomJson = JSON.stringify({ user: 'alice', age: 30 });
      const result = validateAndParseImport(randomJson);
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('rejected') || result.error?.includes('conform'));
    });
  });

  describe('Subtree Clipboard, Copy & Paste Operations', () => {
    it('should extract subtree including all descendants', () => {
      const subtree = extractSubtree('node_root', sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.ok(subtree);
      assert.strictEqual(subtree.rootId, 'node_root');
      assert.strictEqual(subtree.nodes.length, sampleTrees.techSupport.nodes.length);
      assert.strictEqual(subtree.edges.length, sampleTrees.techSupport.edges.length);
    });

    it('should extract partial subtree from an intermediate branch node', () => {
      // node_screen_check has 4 descendants (boot_loop, monitor_cables, happy_login, safe_mode) -> 5 nodes total
      const subtree = extractSubtree('node_screen_check', sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.ok(subtree);
      assert.strictEqual(subtree.rootId, 'node_screen_check');
      assert.strictEqual(subtree.nodes.length, 5);
      assert.strictEqual(subtree.edges.length, 4);
    });

    it('should extract multi-selected nodes and only edges between them', () => {
      const selectedIds = ['node_root', 'node_screen_check', 'node_boot_loop'];
      const subtree = extractSelectedNodes(selectedIds, sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.ok(subtree);
      assert.strictEqual(subtree.nodes.length, 3);
      // edges between root->screen_check (edge_1) and screen_check->boot_loop (edge_3) -> 2 edges
      assert.strictEqual(subtree.edges.length, 2);
    });

    it('should instantiate copied subtree with new unique IDs and offset coordinates', () => {
      const subtree = extractSubtree('node_screen_check', sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.ok(subtree);

      const targetPos = { x: 500, y: 700 };
      const { newNodes, newEdges, newRootId } = instantiateSubtree(subtree, targetPos);

      assert.strictEqual(newNodes.length, subtree.nodes.length);
      assert.strictEqual(newEdges.length, subtree.edges.length);

      // Verify all IDs are completely new and distinct
      const origNodeIds = new Set(subtree.nodes.map(n => n.id));
      for (const n of newNodes) {
        assert.ok(!origNodeIds.has(n.id), `Instantiated node ID "${n.id}" must not collide with original`);
      }
      for (const e of newEdges) {
        assert.ok(newNodes.some(n => n.id === e.sourceNodeId));
        assert.ok(newNodes.some(n => n.id === e.targetNodeId));
      }

      // Verify coordinates are translated relative to targetPos
      const minNewX = Math.min(...newNodes.map(n => n.x));
      const minNewY = Math.min(...newNodes.map(n => n.y));
      assert.strictEqual(minNewX, targetPos.x);
      assert.strictEqual(minNewY, targetPos.y);
    });
  });

  describe('Cycle Detection Algorithm (wouldCreateCycle)', () => {
    const edges: TreeEdge[] = [
      { id: 'e1', sourceNodeId: 'A', targetNodeId: 'B', answer: 'to B' },
      { id: 'e2', sourceNodeId: 'B', targetNodeId: 'C', answer: 'to C' },
      { id: 'e3', sourceNodeId: 'C', targetNodeId: 'D', answer: 'to D' },
    ];

    it('should prevent connecting a node to itself', () => {
      assert.strictEqual(wouldCreateCycle('A', 'A', edges), true);
      assert.strictEqual(wouldCreateCycle('B', 'B', edges), true);
    });

    it('should prevent connecting descendant back to ancestor (creating loop)', () => {
      assert.strictEqual(wouldCreateCycle('D', 'A', edges), true);
      assert.strictEqual(wouldCreateCycle('C', 'A', edges), true);
      assert.strictEqual(wouldCreateCycle('D', 'B', edges), true);
      assert.strictEqual(wouldCreateCycle('C', 'B', edges), true);
    });

    it('should allow valid forward branching without cycles', () => {
      assert.strictEqual(wouldCreateCycle('A', 'D', edges), false);
      assert.strictEqual(wouldCreateCycle('B', 'D', edges), false);
      assert.strictEqual(wouldCreateCycle('D', 'E', edges), false);
    });
  });

  describe('Tree Layout Formatting (formatTreeLayout)', () => {
    it('should format TB (Top-to-Bottom) hierarchy correctly without overlapping coordinates', () => {
      const formatted = formatTreeLayout(
        sampleTrees.techSupport.nodes,
        sampleTrees.techSupport.edges,
        'TB'
      );

      assert.strictEqual(formatted.length, sampleTrees.techSupport.nodes.length);
      for (const node of formatted) {
        assert.ok(!Number.isNaN(node.x), `node ${node.id} x should be a valid number`);
        assert.ok(!Number.isNaN(node.y), `node ${node.id} y should be a valid number`);
      }

      // Root node should have the lowest Y coordinate
      const root = formatted.find(n => n.id === 'node_root')!;
      const children = formatted.filter(n => n.id !== 'node_root');
      for (const c of children) {
        assert.ok(c.y > root.y, `Child node ${c.id} Y (${c.y}) should be below root Y (${root.y})`);
      }
    });

    it('should format LR (Left-to-Right) hierarchy correctly', () => {
      const formatted = formatTreeLayout(
        sampleTrees.databaseSelector.nodes,
        sampleTrees.databaseSelector.edges,
        'LR'
      );

      assert.strictEqual(formatted.length, sampleTrees.databaseSelector.nodes.length);
      const root = formatted.find(n => n.id === 'db_root')!;
      const outcomes = formatted.filter(n => n.type === 'outcome');
      for (const out of outcomes) {
        assert.ok(out.x > root.x, `Outcome node ${out.id} X (${out.x}) should be to the right of root X (${root.x})`);
      }
    });

    it('should format RL (Right-to-Left) hierarchy correctly', () => {
      const formatted = formatTreeLayout(
        sampleTrees.databaseSelector.nodes,
        sampleTrees.databaseSelector.edges,
        'RL'
      );

      assert.strictEqual(formatted.length, sampleTrees.databaseSelector.nodes.length);
      const root = formatted.find(n => n.id === 'db_root')!;
      const outcomes = formatted.filter(n => n.type === 'outcome');
      for (const out of outcomes) {
        assert.ok(out.x < root.x, `Outcome node ${out.id} X (${out.x}) should be to the left of root X (${root.x}) in RL`);
      }
    });

    it('should handle empty nodes array gracefully', () => {
      const formatted = formatTreeLayout([], [], 'TB');
      assert.deepStrictEqual(formatted, []);
    });
  });

  describe('Edge Bezier Path Calculation (calculateEdgePath)', () => {
    const src: TreeNode = { id: 's', question: 'Source', x: 100, y: 100, width: 200, height: 100 };
    const tgt: TreeNode = { id: 't', question: 'Target', x: 100, y: 300, width: 200, height: 100 };

    it('should calculate valid TB cubic bezier path and center label position', () => {
      const result = calculateEdgePath(src, tgt, 'TB');
      assert.ok(result.path.startsWith('M 200 200 C'));
      assert.ok(result.labelX > 0);
      assert.ok(result.labelY > 0);
      assert.ok(!Number.isNaN(result.angle));
    });

    it('should calculate valid LR cubic bezier path', () => {
      const tgtRight: TreeNode = { id: 't2', question: 'Target Right', x: 400, y: 100, width: 200, height: 100 };
      const result = calculateEdgePath(src, tgtRight, 'LR');
      assert.ok(result.path.startsWith('M 300 150 C'));
      assert.ok(result.labelX > 300 && result.labelX < 400);
    });

    it('should calculate valid RL cubic bezier path', () => {
      const tgtLeft: TreeNode = { id: 't3', question: 'Target Left', x: -200, y: 100, width: 200, height: 100 };
      const result = calculateEdgePath(src, tgtLeft, 'RL');
      assert.ok(result.path.startsWith('M 100 150 C'));
      assert.ok(result.labelX < 100 && result.labelX > 0);
    });
  });

  describe('Hidden Node IDs on Collapsed Subtrees (getHiddenNodeIds)', () => {
    it('should return empty set when no nodes are collapsed', () => {
      const hidden = getHiddenNodeIds(sampleTrees.techSupport.nodes, sampleTrees.techSupport.edges);
      assert.strictEqual(hidden.size, 0);
    });

    it('should hide all descendants when intermediate node is collapsed', () => {
      const nodesWithCollapsed = sampleTrees.techSupport.nodes.map(n =>
        n.id === 'node_screen_check' ? { ...n, isCollapsed: true } : n
      );
      const hidden = getHiddenNodeIds(nodesWithCollapsed, sampleTrees.techSupport.edges);
      // node_screen_check has 4 descendants: boot_loop, monitor_cables, happy_login, safe_mode
      assert.strictEqual(hidden.size, 4);
      assert.ok(hidden.has('node_boot_loop'));
      assert.ok(hidden.has('node_monitor_cables'));
      assert.ok(hidden.has('node_happy_login'));
      assert.ok(hidden.has('node_safe_mode'));
      // The collapsed node itself is NOT in hidden set
      assert.ok(!hidden.has('node_screen_check'));
    });
  });
});

