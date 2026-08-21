import React, { useState, useEffect } from 'react';
import { TreeNode } from '../types/tree';
import { X, GitBranch, CheckCircle2, HelpCircle } from 'lucide-react';

interface NodeEditModalProps {
  node: TreeNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: Partial<TreeNode>) => void;
  role?: 'root' | 'branch' | 'outcome' | 'isolated';
}

const COLOR_OPTIONS = [
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Slate', hex: '#475569' },
];

export const NodeEditModal: React.FC<NodeEditModalProps> = ({
  node,
  isOpen,
  onClose,
  onSave,
  role = 'isolated',
}) => {
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (node) {
      setQuestion(node.question || '');
      setDescription(node.description || '');
      setColor(node.color || (role === 'outcome' ? '#10b981' : '#3b82f6'));
    }
  }, [node, role]);

  if (!isOpen || !node) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSave({
      question: question.trim(),
      description: description.trim(),
      color,
    });
    onClose();
  };

  const roleBadgeInfo = {
    root: { label: 'Root Starting Node', desc: 'Starting point of decision flow', icon: GitBranch, bg: 'bg-slate-800 text-amber-400' },
    branch: { label: 'Branching Decision Node', desc: 'Has outgoing answer branches', icon: HelpCircle, bg: 'bg-blue-900/60 text-blue-300' },
    outcome: { label: 'Terminal Outcome Node', desc: 'Leaf node (0 outgoing branches)', icon: CheckCircle2, bg: 'bg-emerald-950 text-emerald-400' },
    isolated: { label: 'Standalone Node', desc: 'Not yet connected in tree', icon: GitBranch, bg: 'bg-slate-800 text-slate-300' },
  }[role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              {node.id.toUpperCase().slice(-6)}
            </span>
            <h2 className="text-xs font-semibold tracking-tight">
              Edit Node Content
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Topology Role Info Banner */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Role:</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${roleBadgeInfo.bg}`}>
              {roleBadgeInfo.label}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{roleBadgeInfo.desc}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs text-slate-800">
          {/* Question / Outcome Text */}
          <div>
            <label htmlFor="node-question-input" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Node Text (Question or Outcome) *
            </label>
            <textarea
              id="node-question-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Is the power light blinking green?"
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 font-medium"
              autoFocus
              required
            />
          </div>

          {/* Optional Description / Subtext */}
          <div>
            <label htmlFor="node-desc-input" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              Subtext / Instruction Notes (Optional)
            </label>
            <textarea
              id="node-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional hints, guidance, or resolution steps..."
              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded border transition-transform ${
                    color === c.hex
                      ? 'scale-110 border-slate-900 ring-2 ring-blue-400'
                      : 'border-slate-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
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
              id="save-node-btn"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors"
            >
              Save Node
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
