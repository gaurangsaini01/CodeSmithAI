import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-1.5 list-disc pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1.5 list-decimal pl-5">{children}</ol>
        ),
        li: ({ children }) => <li className="my-0.5">{children}</li>,
        h1: ({ children }) => (
          <h1 className="my-2 text-base font-bold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="my-2 text-base font-bold">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="my-2 text-sm font-bold">{children}</h3>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline [overflow-wrap:anywhere]"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-1.5 border-l-2 border-outline-variant pl-3 text-on-surface-variant">
            {children}
          </blockquote>
        ),
        pre: ({ children }) => (
          <pre className="my-2 max-w-full overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-highest p-3 font-mono text-[13px] leading-relaxed text-on-surface">
            {children}
          </pre>
        ),
        code: ({ className, children }) => {
          // fenced blocks carry a "language-xxx" class; inline code has none
          const isBlock = /language-/.test(className ?? "");
          return isBlock ? (
            <code className={className}>{children}</code>
          ) : (
            <code className="rounded bg-on-surface/10 px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="my-2 max-w-full overflow-x-auto">
            <table className="border-collapse text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-outline-variant px-2 py-1 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-outline-variant px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
