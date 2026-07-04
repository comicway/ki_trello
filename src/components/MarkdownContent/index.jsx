import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown text with consistent dark-theme styling.
 * Used in descriptions and comments.
 */
export default function MarkdownContent({ children }) {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ node, ...props }) => (
          <p className="mb-2 last:mb-0 text-pearl-white text-sm leading-relaxed" {...props} />
        ),
        strong: ({ node, ...props }) => (
          <strong className="font-semibold text-pearl-white" {...props} />
        ),
        em: ({ node, ...props }) => (
          <em className="italic text-light-gray" {...props} />
        ),
        a: ({ node, href, ...props }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ki-purple underline hover:text-ki-pastel transition-colors break-all"
            {...props}
          />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside mb-2 text-pearl-white text-sm space-y-1" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside mb-2 text-pearl-white text-sm space-y-1" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="text-pearl-white text-sm" {...props} />
        ),
        code: ({ node, inline, ...props }) =>
          inline ? (
            <code
              className="bg-[#1a1d20] text-ki-pastel px-1 py-0.5 rounded text-xs font-mono"
              {...props}
            />
          ) : (
            <pre className="bg-[#1a1d20] rounded p-3 overflow-x-auto mb-2">
              <code className="text-ki-pastel text-xs font-mono" {...props} />
            </pre>
          ),
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-2 border-ki-purple pl-3 italic text-light-gray mb-2"
            {...props}
          />
        ),
        h1: ({ node, ...props }) => <h1 className="text-base font-bold text-pearl-white mb-1" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-sm font-bold text-pearl-white mb-1" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-pearl-white mb-1" {...props} />,
        hr: () => <hr className="border-border-ki my-3" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
