import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  fontSizeScale?: 'sm' | 'base' | 'lg';
}

function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'code';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[10px] text-slate-400">
        <span className="flex items-center gap-1 font-bold text-indigo-400 uppercase">
          <Terminal className="w-3 h-3" /> {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition font-mono text-[10px]"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'COPIED ✓' : 'COPY'}</span>
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-slate-200 leading-relaxed font-mono">
        <code>{codeString}</code>
      </pre>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, fontSizeScale = 'sm' }) => {
  const sizeClass = fontSizeScale === 'lg'
    ? 'text-[15px] sm:text-[16px]'
    : fontSizeScale === 'base'
    ? 'text-[13.5px] sm:text-[14.5px]'
    : 'text-[12px] sm:text-[13px]';

  return (
    <div className={`markdown-body space-y-2.5 ${sizeClass} text-slate-200 leading-relaxed font-sans tracking-normal`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-sm sm:text-base font-bold text-white mt-3.5 mb-2 pb-1 border-b border-slate-800 tracking-wide font-sans">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] sm:text-[14px] font-bold text-slate-100 mt-3 mb-1.5 pb-0.5 border-b border-slate-800/60 font-sans">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-bold text-indigo-300 mt-2.5 mb-1 font-sans">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mt-2 mb-0.5 font-sans">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className={`mb-2 leading-relaxed text-slate-200/90 ${sizeClass}`}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-100">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside space-y-1 my-2 pl-4 text-slate-200/90 leading-relaxed">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside space-y-1 my-2 pl-4 text-slate-200/90 leading-relaxed">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5 mb-0.5">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-500/80 bg-[#0E141F] pl-3 py-1.5 my-2.5 text-slate-300/90 italic rounded-r-md text-[11px] sm:text-xs">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2.5 rounded-lg border border-slate-800/80 bg-[#0B0F17]">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#121824] border-b border-slate-800 text-slate-300 font-semibold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-800/50 text-slate-200">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-900/40 transition">{children}</tr>
          ),
          th: ({ children }) => <th className="px-2.5 py-1.5 font-semibold text-slate-300">{children}</th>,
          td: ({ children }) => <td className="px-2.5 py-1.5">{children}</td>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              {children}
            </a>
          ),
          code({ node, inline, className, children, ...props }: any) {
            if (inline) {
              return (
                <code className="bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-[11px] px-1.5 py-0.5 rounded" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock className={className}>{children}</CodeBlock>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
