import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
}

const CodeBlock: React.FC<CodeBlockProps> = ({ className, children }) => {
  const [copied, setCopied] = useState(false)
  const text = String(children).replace(/\n$/, '')

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-3.5 group w-full max-w-full overflow-hidden">
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <button
          type="button"
          onClick={handleCopy}
          className="bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border border-slate-800/80 flex items-center gap-1 shadow-md hover:scale-[1.02]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="bg-slate-950/90 dark:bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-850 overflow-x-auto w-full max-w-full font-mono text-[11px] leading-relaxed custom-scrollbar shadow-lg">
        <code className={`block whitespace-pre ${className || ''}`}>{children}</code>
      </pre>
    </div>
  )
}

interface MarkdownRendererProps {
  content: string
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-sm font-black text-slate-850 dark:text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-800/80" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xs font-black text-slate-850 dark:text-slate-100 mt-3 mb-1.5 pb-0.5 border-b border-slate-200/50 dark:border-slate-800/40" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 mt-2.5 mb-1" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-300 mt-2 mb-0.5" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-655 dark:text-slate-300 mb-2.5 last:mb-0 font-medium" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-extrabold text-slate-900 dark:text-white" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-4 mb-3 space-y-1 text-slate-655 dark:text-slate-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-4 mb-3 space-y-1 text-slate-655 dark:text-slate-300" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-[11px] sm:text-xs text-slate-655 dark:text-slate-300 font-medium" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="pl-3.5 border-l-4 border-primary/40 bg-slate-100/40 dark:bg-slate-900/30 py-1.5 pr-2 my-3 rounded-r-lg italic text-slate-600 dark:text-slate-400 font-medium text-[11px] sm:text-xs" {...props} />
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ node, className, children, ...props }) => {
            const isInline = !className
            if (!isInline) {
              return <CodeBlock className={className}>{children}</CodeBlock>
            }
            return (
              <code className="bg-slate-200/80 dark:bg-slate-850 text-rose-500 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold" {...props}>
                {children}
              </code>
            )
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto w-full my-3.5 rounded-xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
              <table className="w-full border-collapse text-[11px] sm:text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100/80 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-850" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-slate-150 dark:divide-slate-900/50" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-500/5 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3.5 py-2 text-left font-extrabold text-slate-700 dark:text-slate-250 uppercase tracking-wider text-[9px] sm:text-[10px]" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3.5 py-2 text-slate-600 dark:text-slate-350 font-medium" {...props} />
          ),
          a: ({ node, ...props }) => (
            <a className="text-primary hover:text-primary-dark dark:hover:text-primary-light underline font-bold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-slate-200 dark:border-slate-850" {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
