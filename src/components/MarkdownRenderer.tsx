import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';

  const handleCopy = () => {
    const text = String(children).replace(/\n$/, '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group/code my-4 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <span>{lang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-gray-900 transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} className="text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={lang}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '12px',
            backgroundColor: '#0d1117',
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={cn("px-1.5 py-0.5 rounded-md bg-gray-100 text-indigo-600 font-mono text-[0.9em]", className)} {...props}>
      {children}
    </code>
  );
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none text-gray-800 leading-relaxed prose-pre:p-0 prose-pre:bg-transparent", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold mb-4 mt-6 text-gray-900 tracking-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-3 mt-5 text-gray-900 tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-4 text-gray-900 tracking-tight">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-100 pl-4 py-1 italic text-gray-600 mb-4 bg-indigo-50/20 rounded-r-lg">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6 rounded-xl border border-gray-100 shadow-sm">
              <table className="w-full text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => <th className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-black uppercase tracking-widest text-[9px] text-gray-400">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 border-b border-gray-50 text-[13px]">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
