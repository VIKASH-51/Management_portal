import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0f172a',
    primaryColor: '#6366f1',
    primaryTextColor: '#f8fafc',
    primaryBorderColor: '#818cf8',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a'
  }
});

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chart || !containerRef.current) return;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-amber-400 p-2 bg-slate-900 rounded font-mono">${chart}</pre>`;
        }
      }
    };
    renderChart();
  }, [chart]);

  if (!chart) return null;

  return (
    <div className="mermaid-container p-4 bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
};
