import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { ChatMessage } from "../services/chatApi";
import MessageBubble from "./MessageBubble";
import BrandLogo from "./BrandLogo";

type Props = {
  messages: ChatMessage[];
  isLoading: boolean;
  isError: boolean;
  isSending: boolean;
  hasMore: boolean;
  isFetchingOlder: boolean;
  onLoadOlder: () => void;
  onSuggestion: (text: string) => void;
};

type Suggestion = {
  title: string;
  desc: string;
  prompt: string;
  icon: ReactNode;
};

const SUGGESTIONS: Suggestion[] = [
  {
    title: "Code Refactoring",
    desc: "Optimize React component for performance.",
    prompt:
      "Refactor and optimize this React component for performance:\n\n```tsx\n\n```",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    title: "Debug an Error",
    desc: "Help me fix a Python traceback.",
    prompt:
      "Help me fix this Python error. Here's the traceback:\n\n```\n\n```",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m8 2 1.88 1.88" />
        <path d="M14.12 3.88 16 2" />
        <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" />
      </svg>
    ),
  },
  {
    title: "Explain a Concept",
    desc: "Break down how database indexing works.",
    prompt: "Explain how database indexing works, with a simple example.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    title: "Draft & Brainstorm",
    desc: "Write a product launch announcement.",
    prompt:
      "Draft a concise, exciting product launch announcement for a new AI feature.",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v2M5.6 5.6l1.4 1.4M3 12h2M18 12h2M17 7l1.4-1.4M9.5 14.5 12 9l2.5 5.5" />
        <path d="M12 17v4M8 21h8" />
      </svg>
    ),
  },
];

export default function MessageList({
  messages,
  isLoading,
  isError,
  isSending,
  hasMore,
  isFetchingOlder,
  onLoadOlder,
  onSuggestion,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const isPrependingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isFetchingOlder) {
          prevScrollHeightRef.current = container.scrollHeight;
          prevScrollTopRef.current = container.scrollTop;
          isPrependingRef.current = true;
          onLoadOlder();
        }
      },
      { root: container },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingOlder, onLoadOlder]);

  // On older-page prepend, restore the previous scroll position so the list
  // doesn't jump; otherwise stick to the bottom (new message / first load).
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isPrependingRef.current) {
      const delta = container.scrollHeight - prevScrollHeightRef.current;
      container.scrollTop = prevScrollTopRef.current + delta;
      isPrependingRef.current = false;
    } else {
      endRef.current?.scrollIntoView();
    }
  }, [messages]);

  useEffect(() => {
    if (isSending) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isSending]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <div ref={sentinelRef} />

        {isFetchingOlder && (
          <div className="mx-auto type-label-md text-on-surface-variant">
            Loading older…
          </div>
        )}

        {isLoading ? (
          <div className="m-auto flex flex-col items-center gap-3 py-20 text-on-surface-variant">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-outline-variant border-t-primary" />
            <span className="text-sm">Loading messages…</span>
          </div>
        ) : isError ? (
          <div className="m-auto py-20 text-sm text-error">
            History didn't load. Please try again after some time.
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto flex w-full max-w-2xl flex-col items-center sm:py-12 text-center">
            <BrandLogo className="glow-primary mb-5 h-14 w-14" />
            <h2 className="text-2xl font-semibold leading-[1.1] tracking-[-0.02em] text-on-surface sm:text-5xl">
              How can I assist you today?
            </h2>
            <p className="mt-3 leading-[1.6] text-sm text-on-surface-variant">
              Engage with premium intelligence for complex problem solving,
              creative drafting, or data analysis.
            </p>
            <div className="mt-8 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.title}
                  onClick={() => onSuggestion(s.prompt)}
                  className="glass flex flex-col items-start rounded-lg p-4 transition-all ease-out duration-300 hover:border-primary/70"
                >
                  <div className="mb-1.5   flex items-center gap-2.5">
                    <span className="text-primary">{s.icon}</span>
                    <span className="text-sm font-semibold text-on-surface">
                      {s.title}
                    </span>
                  </div>
                  <p className="text-sm  text-left text-on-surface-variant">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}

        {isSending && (
          <div className="flex w-full gap-3 self-start md:max-w-[88%]">
            <BrandLogo className="mt-0.5 h-7 w-7" />
            <div className="bubble-ai text-sm italic text-on-surface-variant">
              Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
