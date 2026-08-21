import React, { useState } from 'react';
import { TreeData } from '../types/tree';
import { sampleTrees } from '../utils/sampleTrees';
import { Upload, FileText, X, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { validateAndParseImport } from '../utils/treeUtils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTree: (tree: TreeData) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportTree,
}) => {
  const [fileText, setFileText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    const result = validateAndParseImport(fileText);
    if (!result.success || !result.tree) {
      setError(result.error || 'Failed to parse file. Only files exported by Decision Tree Studio are supported.');
      return;
    }

    onImportTree(result.tree);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessInfo(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setFileText(content);

        const result = validateAndParseImport(content);
        if (!result.success || !result.tree) {
          setError(result.error || 'Import rejected: This file was not exported by Decision Tree Studio.');
          return;
        }

        onImportTree(result.tree);
        onClose();
      } catch (err: any) {
        setError('Error reading file: ' + (err.message || err));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
              IMPORT
            </span>
            <h2 className="text-xs font-semibold tracking-tight">Import Decision Tree File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-800">
          {/* Studio Export Restriction Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded p-2.5 flex items-start gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-blue-900">
                Decision Tree Studio Text & JSON Import
              </p>
              <p className="text-[10px] text-blue-700 leading-relaxed mt-0.5">
                Upload or paste files exported by Decision Tree Studio (.txt, .json, .md, or .yaml). Foreign text formats are strictly verified for security and integrity.
              </p>
            </div>
          </div>

          {/* Upload File Input */}
          <div>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 rounded p-4 cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-800">
                Click to browse or drop an exported tree file
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                Accepts .txt, .json, .md, .yaml exported by Decision Tree Studio
              </span>
              <input
                type="file"
                accept=".txt,.json,.md,.yaml,text/plain,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Paste Exported Text */}
          <form onSubmit={handleTextSubmit} className="space-y-2">
            <div>
              <label htmlFor="import-content-textarea" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Or Paste Exported File Text Directly:
              </label>
              <textarea
                id="import-content-textarea"
                rows={4}
                value={fileText}
                onChange={(e) => {
                  setFileText(e.target.value);
                  setError(null);
                }}
                placeholder="Paste the exported outline, markdown, YAML, or JSON from Decision Tree Studio..."
                className="w-full px-3 py-2 text-xs font-mono rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!fileText.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded transition-colors"
              >
                Validate & Import File
              </button>
            </div>
          </form>

          {/* Preset Templates */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Preset Tree Templates
            </span>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(sampleTrees).map(([key, template]) => (
                <div
                  key={key}
                  onClick={() => {
                    onImportTree(template);
                    onClose();
                  }}
                  className="group flex items-center justify-between p-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded cursor-pointer transition-all"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                      {template.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {template.nodes.length} nodes • Direction: {template.growthDirection}
                    </p>
                  </div>
                  <button className="px-2 py-0.5 bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-[10px] font-semibold rounded transition-colors">
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
