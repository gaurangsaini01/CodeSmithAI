import type { KeyboardEvent } from "react";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: (text: string) => void;
  disabled: boolean;
};

export default function Composer({ value, onChange, onSend, disabled }: Props) {
  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    onChange("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-outline-variant bg-surface px-4 py-4 md:px-5">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative flex items-end gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-2 py-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <textarea
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Halo…"
            className="max-h-44 flex-1 resize-none bg-transparent sm:px-3 px-1 py-2 text-[15px] leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/60"
          />

          <button
            onClick={submit}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="glow-primary mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
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
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-on-surface-variant/70">
          Halo can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
