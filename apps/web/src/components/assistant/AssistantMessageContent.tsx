import { useMemo } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type AssistantMessageContentProps = {
  content: string;
  variant?: 'assistant' | 'user' | 'error';
};

const userComponents: Components = {
  p: ({ children }) => <p className="text-sm leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
};

export function AssistantMessageContent({ content, variant = 'assistant' }: AssistantMessageContentProps) {
  const navigate = useNavigate();

  const assistantComponents = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h3>
      ),
      h2: ({ children }) => (
        <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h3>
      ),
      h3: ({ children }) => (
        <h4 className="text-[13px] font-semibold text-gray-900 mt-3 mb-1.5 first:mt-0">{children}</h4>
      ),
      h4: ({ children }) => (
        <h5 className="text-xs font-semibold text-gray-800 mt-2 mb-1 first:mt-0">{children}</h5>
      ),
      p: ({ children }) => (
        <p className="text-sm leading-relaxed text-gray-700 mb-2 last:mb-0">{children}</p>
      ),
      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
      em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
      ul: ({ children }) => (
        <ul className="my-2 ml-4 list-disc space-y-1 text-sm text-gray-700 marker:text-brand-secondary">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="my-2 ml-4 list-decimal space-y-1 text-sm text-gray-700 marker:font-medium marker:text-brand-secondary">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-relaxed pl-0.5">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-brand-secondary/40 bg-brand-secondary/5 px-3 py-2 text-sm text-gray-700 rounded-r-md">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-gray-200" />,
      a: ({ href, children }) => {
        const isInternal = href?.startsWith('/#/');
        if (isInternal && href) {
          return (
            <button
              type="button"
              className="font-medium text-brand-secondary underline underline-offset-2 hover:text-brand-primary"
              onClick={() => navigate(href.slice(2))}
            >
              {children}
            </button>
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-secondary underline underline-offset-2 hover:text-brand-primary"
          >
            {children}
          </a>
        );
      },
      code: ({ className, children }) => {
        const isBlock = className?.includes('language-');
        if (isBlock) {
          return (
            <code className="block overflow-x-auto rounded-md bg-gray-100 px-3 py-2 text-xs font-mono text-gray-800">
              {children}
            </code>
          );
        }
        return (
          <code className="rounded bg-gray-100 px-1 py-0.5 text-[12px] font-mono text-gray-800">{children}</code>
        );
      },
      pre: ({ children }) => (
        <pre className="my-2 overflow-x-auto rounded-md bg-gray-100 p-3 text-xs">{children}</pre>
      ),
      table: ({ children }) => (
        <div className="my-2 overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-xs">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
      th: ({ children }) => (
        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-700">{children}</td>,
      tr: ({ children }) => <tr className="divide-x divide-gray-100 even:bg-gray-50/60">{children}</tr>,
    }),
    [navigate],
  );

  if (variant === 'error') {
    return <p className="text-sm leading-relaxed text-red-700">{content}</p>;
  }

  if (variant === 'user') {
    return (
      <div className="text-sm leading-relaxed text-white">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={userComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={cn('assistant-markdown min-w-0')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={assistantComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
