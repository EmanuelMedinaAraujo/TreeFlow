import React, { useState, useEffect } from 'react';
import { TreeData, TreeNode, TreeEdge } from '../types/tree';
import { findRootNodes, getChildEdges } from '../utils/treeUtils';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  X, 
  Sparkles,
  ChevronRight,
  Route
} from 'lucide-react';

interface TreeSimulatorModalProps {
  tree: TreeData;
  isOpen: boolean;
  onClose: () => void;
  onSelectNodeOnCanvas?: (nodeId: string) => void;
}

interface StepHistory {
  node: TreeNode;
  chosenAnswer?: string;
}

export const TreeSimulatorModal: React.FC<TreeSimulatorModalProps> = ({
  tree,
  isOpen,
  onClose,
  onSelectNodeOnCanvas,
}) => {
  const [history, setHistory] = useState<StepHistory[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tree.nodes.length > 0) {
      const roots = findRootNodes(tree.nodes, tree.edges);
      const rootNode = roots[0] || tree.nodes[0];
      setCurrentNodeId(rootNode.id);
      setHistory([{ node: rootNode }]);
    }
  }, [isOpen, tree]);

  if (!isOpen) return null;

  const currentNode = tree.nodes.find(n => n.id === currentNodeId);
  const outgoingEdges = currentNode ? getChildEdges(currentNode.id, tree.edges) : [];
  const isOutcome = currentNode?.type === 'outcome' || (outgoingEdges.length === 0 && currentNode !== undefined);

  const handleChooseAnswer = (edge: TreeEdge) => {
    const targetNode = tree.nodes.find(n => n.id === edge.targetNodeId);
    if (!targetNode) return;

    setHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].chosenAnswer = edge.answer;
      }
      return [...updated, { node: targetNode }];
    });

    setCurrentNodeId(targetNode.id);
    if (onSelectNodeOnCanvas) onSelectNodeOnCanvas(targetNode.id);

    const nextOutgoing = getChildEdges(targetNode.id, tree.edges);
    if (targetNode.type === 'outcome' || nextOutgoing.length === 0) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // fallback
      }
    }
  };

  const handleRestart = () => {
    const roots = findRootNodes(tree.nodes, tree.edges);
    const rootNode = roots[0] || tree.nodes[0];
    setCurrentNodeId(rootNode.id);
    setHistory([{ node: rootNode }]);
    if (onSelectNodeOnCanvas) onSelectNodeOnCanvas(rootNode.id);
  };

  const handleStepBack = (index: number) => {
    const targetHistory = history.slice(0, index + 1);
    setHistory(targetHistory);
    const targetNode = targetHistory[targetHistory.length - 1].node;
    setCurrentNodeId(targetNode.id);
    if (onSelectNodeOnCanvas) onSelectNodeOnCanvas(targetNode.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
              <Play className="w-2.5 h-2.5 fill-white" />
              SIMULATOR
            </span>
            <h2 className="text-xs font-semibold tracking-tight">Interactive Tree Simulator</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-xs"
              title="Restart Simulator"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Restart</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb Trail */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 overflow-x-auto flex items-center gap-1.5 text-xs">
          <Route className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {history.map((step, idx) => (
            <React.Fragment key={step.node.id + idx}>
              <button
                onClick={() => handleStepBack(idx)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors truncate max-w-[140px] ${
                  idx === history.length - 1
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-200'
                }`}
                title={step.node.question}
              >
                {step.node.question}
              </button>
              {step.chosenAnswer && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded font-mono font-bold">
                    "{step.chosenAnswer}"
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Main Stage */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center items-center text-center bg-slate-50">
          {currentNode ? (
            <div className="w-full max-w-md space-y-4">
              {/* Question / Outcome Card */}
              <div className={`p-5 rounded-lg border text-left ${
                isOutcome 
                  ? 'bg-emerald-50 border-emerald-300 shadow-sm' 
                  : 'bg-white border-slate-800 shadow-md'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-500">
                    {isOutcome ? 'Terminal Outcome' : `Question Node (${currentNode.id.slice(-4)})`}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isOutcome ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {currentNode.question}
                </h3>

                {currentNode.description && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {currentNode.description}
                  </p>
                )}
              </div>

              {/* Answers Grid */}
              {!isOutcome && outgoingEdges.length > 0 && (
                <div className="space-y-2 pt-1 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block pl-0.5">
                    Select Response / Branch:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {outgoingEdges.map((edge) => (
                      <button
                        key={edge.id}
                        id={`sim-answer-${edge.id}`}
                        onClick={() => handleChooseAnswer(edge)}
                        className="group flex items-center justify-between px-4 py-2.5 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-500 rounded text-xs font-semibold text-slate-800 hover:text-blue-700 shadow-xs transition-all text-left"
                      >
                        <span className="font-mono text-blue-600 mr-2 font-bold">IF:</span>
                        <span className="flex-1 pr-2 truncate">
                          "{edge.answer || 'Default'}"
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Terminal Outcome celebration */}
              {isOutcome && (
                <div className="pt-2 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Decision Path Reached!</span>
                  </div>
                  <div>
                    <button
                      onClick={handleRestart}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs transition-colors"
                    >
                      Run Another Simulation
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No nodes in the tree yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-white">
          <span className="text-[11px] text-slate-500 font-mono">
            Path Depth: <strong>{history.length} steps</strong>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
