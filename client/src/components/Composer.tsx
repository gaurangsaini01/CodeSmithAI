import { useState } from "react";
import type { KeyboardEvent } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled: boolean;
};

export default function Composer({ onSend, disabled }: Props) {
  const [input, setInput] = useState("");

  function submit() {
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex items-end gap-2.5 border-t border-gray-200 px-5 py-4">
      <textarea
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message...  (Enter to send, Shift+Enter = newline)"
        className="max-h-40 flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-600"
      />
      <button
        onClick={submit}
        disabled={disabled || !input.trim()}
        className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
