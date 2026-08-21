import React, { useState } from 'react';
import { TreeData, ExportFormat } from '../types/tree';
import { exportTreeText } from '../utils/treeUtils';
import { 
  Download, 
  Copy, 
  Check, 
  X, 
  FileText, 
  Code2, 
  ListTree, 
  Share2,
  Route
} from 'lucide-react';

interface ExportModalProps {
  tree: TreeData;
  isOpen: boolean;
  onClose: () => void;
}

const FORMATS: { id: ExportFormat; label: string; ext: string; icon: React.ReactNode; desc: string }[] = [
  { 
    id: 'outline', 
    label: 'Text Outline', 
    ext: 'txt', 
    icon: <ListTree className="w-3.5 h-3.5" />, 
    desc: 'Human-readable ASCII tree with dialogue questions & branch answers' 
  },
  { 
    id: 'markdown', 
    label: 'Markdown', 
    ext: 'md', 
    icon: <FileText className="w-3.5 h-3.5" />, 
    desc: 'Formatted markdown nested list with outcome badges' 
  },
  { 
    id: 'paths', 
    label: 'Decision Paths', 
    ext: 'txt', 
    icon: <Route className="w-3.5 h-3.5" />, 
    desc: 'Complete list of all unique root-to-outcome traversal paths' 
  },
  { 
    id: 'mermaid', 
    label: 'Mermaid Diagram', 
    ext: 'txt', 
    icon: <Share2 className="w-3.5 h-3.5" />, 
    desc: 'Mermaid.js flowchart code for GitHub / Notion / diagrams' 
  },
  { 
    id: 'json', 
    label: 'JSON Data', 
    ext: 'json', 
    icon: <Code2 className="w-3.5 h-3.5" />, 
    desc: 'Complete structured JSON file for backup and re-importing' 
  },
  { 
    id: 'yaml', 
    label: 'YAML Outline', 
    ext: 'yaml', 
    icon: <FileText className="w-3.5 h-3.5" />, 
    desc: 'Structured YAML tree format' 
  },
];

export const ExportModal: React.FC<ExportModalProps> = ({ tree, isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('outline');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentContent = exportTreeText(tree, selectedFormat);
  const currentFormatMeta = FORMATS.find(f => f.id === selectedFormat)!;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = () => {
    const filename = `${tree.name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'decision_tree'}.${currentFormatMeta.ext}`;
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
              EXPORT
            </span>
            <h2 className="text-xs font-semibold tracking-tight">Export Tree as Text File</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex gap-1.5 overflow-x-auto">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              id={`export-tab-${fmt.id}`}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all whitespace-nowrap ${
                selectedFormat === fmt.id
                  ? 'bg-slate-700 text-white font-medium shadow-xs border border-slate-600'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {fmt.icon}
              <span>{fmt.label}</span>
            </button>
          ))}
        </div>

        {/* Format Description & Stats */}
        <div className="px-4 py-1.5 bg-slate-100 text-[11px] text-slate-600 border-b border-slate-200 flex items-center justify-between">
          <span>{currentFormatMeta.desc}</span>
          <span className="font-mono text-slate-500 text-[10px]">
            {currentContent.split('\n').length} lines • {currentContent.length} bytes
          </span>
        </div>

        {/* Code / Text Preview */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-200">
          <pre className="whitespace-pre font-mono leading-relaxed select-text">
            {currentContent}
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-white">
          <span className="text-[11px] text-slate-500 font-mono">
            File: <strong>.{currentFormatMeta.ext}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="copy-export-btn"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              type="button"
              id="download-export-btn"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .{currentFormatMeta.ext} File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
