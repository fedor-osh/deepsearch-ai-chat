import type { Message } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
import { Search, Loader2 } from "lucide-react";

type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  message: Message;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const ToolInvocation = ({ part }: { part: MessagePart }) => {
  if (part.type !== "tool-invocation") return null;

  const { toolInvocation } = part;
  const isPartial = toolInvocation.state === "partial-call";
  const isCall = toolInvocation.state === "call";
  const isResult = toolInvocation.state === "result";

  return (
    <div className="mb-4 rounded-lg border border-gray-600 bg-gray-700 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Search className="size-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-300">
          {toolInvocation.toolName}
        </span>
        {isPartial && (
          <Loader2 className="size-3 animate-spin text-yellow-400" />
        )}
        {isCall && <span className="text-xs text-yellow-400">Calling...</span>}
        {isResult && <span className="text-xs text-green-400">Complete</span>}
      </div>

      {isPartial || isCall ? (
        <div className="text-sm text-gray-400">
          <div className="mb-1 font-medium">Arguments:</div>
          <pre className="rounded bg-gray-800 p-2 text-xs">
            {JSON.stringify(toolInvocation.args, null, 2)}
          </pre>
        </div>
      ) : isResult ? (
        <div className="text-sm text-gray-400">
          <div className="mb-1 font-medium">Result:</div>
          <pre className="rounded bg-gray-800 p-2 text-xs">
            {JSON.stringify(toolInvocation.result, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
};

const MessagePartRenderer = ({ part }: { part: MessagePart }) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
    case "tool-invocation":
      return <ToolInvocation part={part} />;
    default:
      return null;
  }
};

export const ChatMessage = ({ message, userName }: ChatMessageProps) => {
  const isAI = message.role === "assistant";
  const parts = message.parts || [];

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {parts.length > 0 ? (
            parts.map((part, index) => (
              <MessagePartRenderer key={index} part={part} />
            ))
          ) : (
            <Markdown>{message.content || ""}</Markdown>
          )}
        </div>
      </div>
    </div>
  );
};
