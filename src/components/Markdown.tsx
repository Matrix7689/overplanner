import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders a note body. Raw HTML is not rendered (react-markdown's default),
// and unsafe link protocols are dropped. Links open in a new tab.
const components: Components = {
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      className="break-all text-sky-700 underline hover:text-sky-900"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="mt-3 mb-1 text-lg font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-3 mb-1 text-base font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-2 mb-1 text-sm font-semibold first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-stone-300 pl-3 text-stone-500">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-stone-100 px-1 font-mono text-[0.85em]">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded bg-stone-100 p-2 text-xs">{children}</pre>,
  table: ({ children }) => <table className="my-2 text-xs">{children}</table>,
  th: ({ children }) => <th className="border border-stone-200 px-2 py-1 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-stone-200 px-2 py-1">{children}</td>,
};

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`text-sm leading-relaxed break-words text-stone-700 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
