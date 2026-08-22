import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sampleTrees } from './sampleTrees';
import { exportTreeText, validateAndParseImport, getNodeRole, getTreeMetrics } from './treeUtils';
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

    for (const format of ['json', 'outline', 'markdown', 'yaml', 'paths'] as const) {
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
});
