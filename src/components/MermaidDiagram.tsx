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

    // Sanitize common AI-generated Mermaid syntax errors
    const sanitizeMermaid = (mermaidStr: string): string => {
      if (!mermaidStr) return mermaidStr;

      let result = mermaidStr;

      // 1. Remove stray double-quotes that aren't inside node brackets.
      //    AI often generates: -->"B(Process 1") instead of --> B["Process 1"]
      //    Process line-by-line to be safe.
      result = result.split('\n').map(line => {
        // Skip the first line (graph/flowchart declaration)
        if (/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph)\b/.test(line)) {
          return line;
        }
        // Remove stray quotes that aren't inside bracket delimiters [" "], (" "), {" "}
        // First, strip all double-quotes, then re-add them where needed
        let cleaned = line.replace(/"/g, '');
        return cleaned;
      }).join('\n');

      // 2. Quote node labels that contain parentheses or special chars
      //    e.g. B(Process 1) -> B["Process 1"] since () is a shape delimiter
      //    Match: ID(text with spaces) where text has spaces (likely meant as label, not shape)
      result = result.replace(/([A-Za-z0-9_]+)\(([^)]*\s[^)]*)\)/g, (match, id, text) => {
        return `${id}["${text}"]`;
      });

      // 3. Fix decision nodes: C{Decision Point} is valid Mermaid rhombus
      //    but C{text} with special chars needs quoting
      result = result.replace(/([A-Za-z0-9_]+)\{([^}]*[`"()][^}]*)\}/g, (match, id, text) => {
        const clean = text.replace(/"/g, "'");
        return `${id}{"${clean}"}`;
      });

      return result;
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
