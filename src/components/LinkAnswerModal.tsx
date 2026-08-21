import React, { useState, useEffect } from 'react';
import { TreeNode, TreeEdge } from '../types/tree';
import { ArrowRight, HelpCircle, Sparkles, X } from 'lucide-react';

interface LinkAnswerModalProps {
  isOpen: boolean;
  sourceNode: TreeNode | null;
  targetNode: TreeNode | null;
  edge: TreeEdge | null;
  onClose: () => void;
  onSave: (answerText: string) => void;
}

const COMMON_PRESETS = [
  'Yes',
  'No',
  'True',
  'False',
  'Success',
  'Error',
  'Option A',
  'Option B',
  'Custom',
];

export const LinkAnswerModal: React.FC<LinkAnswerModalProps> = ({
  isOpen,
  sourceNode,
  targetNode,
  edge,
  onClose,
  onSave,
}) => {
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (edge) {
      setAnswer(edge.answer || '');
    } else {
      setAnswer('');
    }
  }, [edge, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onSave(answer.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark High Density Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
              BRANCH
            </span>
            <h2 className="text-xs font-semibold tracking-tight">
              {edge ? 'Edit Branch Answer' : 'Configure Branch Answer'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Question Preview Context */}
        {sourceNode && (
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs">
            <div className="text-slate-500 font-medium mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
              <span>Parent Question:</span>
            </div>
            <p className="font-semibold text-slate-800 line-clamp-2">
              "{sourceNode.question}"
            </p>
            {targetNode && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center gap-1.5 text-slate-500 text-[11px]">
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">Leads to: <strong>"{targetNode.question}"</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs text-slate-800">
          <div>
            <label htmlFor="branch-answer-input" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Answer Condition (IF) *
            </label>
            <input
              id="branch-answer-input"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="e.g. Yes, No, > 50 MB, Linux..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 font-mono font-bold"
              autoFocus
              required
            />
          </div>

          {/* Quick Presets */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-1">
              {COMMON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAnswer(preset)}
                  className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="save-answer-btn"
              disabled={!answer.trim()}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded shadow-xs transition-colors"
            >
              {edge ? 'Update Answer' : 'Create Branch Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
