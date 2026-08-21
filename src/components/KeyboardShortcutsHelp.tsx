import React from 'react';
import { X, MousePointer, Keyboard, Sparkles } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-700 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Dark Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">
              HELP
            </span>
            <h2 className="text-xs font-semibold tracking-tight">
              Desktop Gestures & Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-slate-700">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5">
              <MousePointer className="w-3.5 h-3.5 text-blue-500" />
              <span>Canvas Mouse Interactions</span>
            </div>
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="flex justify-between items-center">
                <span>Add Node on Plane</span>
                <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Right-Click</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pan Canvas</span>
                <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Drag Canvas / Space+Drag</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Zoom In / Out</span>
                <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Wheel / Pinch</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Connect Nodes</span>
                <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Drag (+) port</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Drag to Empty Canvas</span>
                <span className="font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Auto-creates branch</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1.5">
              <Keyboard className="w-3.5 h-3.5 text-emerald-500" />
              <span>Keyboard Shortcuts</span>
            </div>
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded border border-slate-200">
              <div className="flex justify-between items-center">
                <span>Copy Subtree</span>
                <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Ctrl + C</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Paste Subtree</span>
                <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Ctrl + V</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delete Selected Node / Link</span>
                <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Delete / Backspace</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Undo / Redo</span>
                <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Ctrl + Z / Ctrl + Y</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Auto-Format Tree</span>
                <span className="font-mono font-semibold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">Ctrl + F</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-2 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
