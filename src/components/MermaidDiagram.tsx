import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Copy, Check } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Helper to safely wrap node labels that contain backticks or parens in double quotes
    // Flowchart specific node shapes: [label], (label), {label}, ((label)), >label], etc.
    const sanitizeMermaid = (mermaidStr: string): string => {
      if (!mermaidStr || (!mermaidStr.includes('graph ') && !mermaidStr.includes('flowchart '))) return mermaidStr;

      // This regex matches node definitions robustly regardless of internal spaces
      const nodeLabelRegex = /([A-Za-z0-9_-]+)(\[|\(|\{|\(\(|>|\])(.*?)(]|\)|\}|\)\)|])(?=[\s\n-]|$)/g;

      return mermaidStr.replace(nodeLabelRegex, (match, id, open, text: string, close) => {
        const trimmedText = text.trim();
        
        // If the inner text is already quoted, leave it alone
        if (trimmedText.startsWith('"') && trimmedText.endsWith('"')) {
          return match;
        }

        // Only quote the text if it contains dangerous characters like backticks, quotes, or parens
        if (/[`"()]/.test(text)) {
          // Inner double quotes break the outer double quote wrapper, so convert them to single quotes
          const escapedText = trimmedText.replace(/"/g, "'");
          return `${id}${open}"${escapedText}"${close}`;
        }
        
        return match;
      });
    };

    const renderDiagram = async () => {
      if (!chart || chart.trim() === '') return;
      
      try {
        setError(null);
        const sanitizedChart = sanitizeMermaid(chart);
        const id = `mermaid-container-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, sanitizedChart);
        
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (e: any) {
        if (isMounted) {
          console.error("Mermaid rendering failed:", e);
          setError(e.message || "Failed to render diagram.");
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chart);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = chart;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (error) {
    return (
      <div className="mermaid-error bg-red-900/20 border justify-center border-red-500/50 p-4 rounded-md my-4">
        <div className="text-red-400 font-semibold mb-2">Mermaid Syntax Error</div>
        <pre className="text-red-300 text-sm overflow-x-auto whitespace-pre-wrap">{error}</pre>
        <div className="mt-4 text-xs text-zinc-400">Original syntax:</div>
        <pre className="text-zinc-500 text-xs overflow-x-auto mt-1">{chart}</pre>
      </div>
    );
  }

  return (
    <div className="relative group my-6 rounded-lg border border-zinc-800/50 overflow-hidden">
      <div className="bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-400 border-b border-zinc-700/50 flex justify-between items-center">
        <span>mermaid</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
          title={copied ? 'Copied!' : 'Copy diagram source'}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div 
        ref={containerRef}
        className="mermaid-diagram flex justify-center py-4 bg-zinc-900/30 overflow-x-auto print:hidden"
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
};
