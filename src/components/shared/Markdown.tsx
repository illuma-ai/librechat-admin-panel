import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import { cn, isStringMarkdown } from '@/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Render text as GitHub-flavored markdown when it looks like markdown, otherwise
 * as preformatted plain text. Output is sanitized (rehype-sanitize) since trace
 * content is untrusted. Styling lives in the `.trace-markdown` class (styles.css).
 */
export function Markdown({ children, className }: MarkdownProps) {
  if (!children) return null;
  if (!isStringMarkdown(children)) {
    return (
      <div className={cn('trace-markdown wrap-break-word whitespace-pre-wrap', className)}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn('trace-markdown wrap-break-word', className)}>
      <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
