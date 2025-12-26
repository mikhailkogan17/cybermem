
import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-3xl font-bold text-white mb-6 mt-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-semibold text-emerald-400 mb-4 mt-8">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-medium text-white mb-3 mt-6">{children}</h3>,
    p: ({ children }) => <p className="text-neutral-300 leading-7 mb-4">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-neutral-300 ml-4">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-neutral-300 ml-4">{children}</ol>,
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ href, children }) => <a href={href} className="text-emerald-400 hover:text-emerald-300 hover:underline transition-colors">{children}</a>,
    code: ({ children }) => <code className="bg-white/10 text-emerald-300 px-1.5 py-0.5 rounded text-sm font-mono border border-white/5">{children}</code>,
    pre: ({ children }) => <pre className="bg-[#0B1116] border border-white/10 rounded-lg p-4 overflow-x-auto mb-6 text-sm font-mono shadow-inner text-neutral-300">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="border-l-4 border-emerald-500/50 pl-4 py-1 my-4 bg-emerald-500/5 text-neutral-400 italic rounded-r">{children}</blockquote>,
    ...components,
  }
}
