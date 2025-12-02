import React from 'react';

interface Props {
  content: string;
}

// Basic formatter to handle code blocks and bold text simply without heavy libraries
// For a production app, use react-markdown
const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-content text-sm leading-relaxed space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const codeContent = part.replace(/^```\w*\n?/, '').replace(/```$/, '');
          return (
            <pre key={index} className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto my-2 text-xs font-mono">
              <code>{codeContent}</code>
            </pre>
          );
        }
        
        // Handle bold text (**text**) and newlines
        const lines = part.split('\n');
        return (
          <div key={index}>
             {lines.map((line, lineIdx) => {
                 if (!line.trim()) return <div key={lineIdx} className="h-2"></div>;
                 
                 const boldParts = line.split(/(\*\*.*?\*\*)/g);
                 return (
                     <p key={lineIdx} className="mb-1">
                         {boldParts.map((bPart, bIdx) => {
                             if (bPart.startsWith('**') && bPart.endsWith('**')) {
                                 return <strong key={bIdx} className="font-semibold text-gray-900">{bPart.slice(2, -2)}</strong>;
                             }
                             return <span key={bIdx}>{bPart}</span>;
                         })}
                     </p>
                 )
             })}
          </div>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;