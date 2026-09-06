import React from 'react';
import ReactMarkdown from 'react-markdown';

export const JSONViewer = ({ data, level = 0 }: { data: unknown, level?: number }) => {
  if (typeof data !== 'object' || data === null) {
    return <span className="font-medium text-[#111111] whitespace-normal font-sans leading-relaxed">{String(data)}</span>
  }
  if (Array.isArray(data)) {
    return (
      <div className="flex flex-col gap-2 w-full mt-1 whitespace-normal font-sans">
        {data.map((item, i) => (
          <div key={i} className="pl-3 border-l-[3px] border-[#E5E5E5]">
            <JSONViewer data={item} level={level + 1} />
          </div>
        ))}
      </div>
    )
  }
  
  return (
    <div className={`whitespace-normal font-sans grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2 ${level === 0 ? 'bg-white p-4 border border-[#E5E5E5] rounded shadow-sm w-full my-3' : 'mt-1 w-full'}`}>
      {Object.entries(data as Record<string, unknown>).map(([key, val]) => {
        const isNested = typeof val === 'object' && val !== null;
        return (
          <div key={key} className={`flex flex-col ${isNested ? 'col-span-full mt-2' : ''}`}>
            <span className="text-[11px] uppercase text-[#6B6B6B] font-bold tracking-wider mb-1">{key.replace(/_/g, ' ')}</span>
            <div className="text-[13px] text-[#111111] break-words">
              <JSONViewer data={val} level={level + 1} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const MarkdownWithJSON = ({ content }: { content: string }) => {
  let processedContent = content || '';
  if (typeof processedContent === 'string') {
    processedContent = processedContent.replace(/\\n/g, '\n');
  }

  if (!processedContent.includes('```')) {
    const start = processedContent.indexOf('{');
    const end = processedContent.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      processedContent = processedContent.substring(0, start) + '\n```json\n' + processedContent.substring(start, end + 1) + '\n```\n' + processedContent.substring(end + 1);
    }
  }

  return (
    <ReactMarkdown
      components={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code({ inline, children, ...props }: any) {
          if (!inline) {
            try {
              const parsed = JSON.parse(String(children).trim());
              return <JSONViewer data={parsed} />
            } catch { /* not valid JSON, render as code */ }
          }
          return (
            <code className="bg-[#F5F5F5] text-[#FF6600] px-1 py-0.5 rounded text-[12px] font-mono" {...props}>
              {children}
            </code>
          )
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pre({ children, ...props }: any) {
          // If the inner element is our JSONViewer (returned by code), just return it without wrapping in <pre>
          const isJSONViewer = React.Children.toArray(children).some(
            (child) => React.isValidElement(child) && (child.type === JSONViewer || ('data' in (child.props as Record<string, unknown>)))
          );
          if (isJSONViewer) return <div className="mb-6">{children}</div>;
          
          return (
            <pre className="bg-[#F5F5F5] border border-[#E5E5E5] p-3 rounded overflow-x-auto text-[13px] mb-6" {...props}>
              {children}
            </pre>
          )
        }
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}
