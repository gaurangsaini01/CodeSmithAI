import type { Conversation } from "../types";

type Props = {
  conversations: Conversation[];
  activeChatId: string;
  onSelect: (id: string) => void;
};

export default function ConversationList({
  conversations,
  activeChatId,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Conversations
      </span>
      <div className="flex flex-col gap-1.5">
        {conversations.map((c) => {
          const active = c.id === activeChatId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left transition ${
                active
                  ? "border border-gray-200 bg-white"
                  : "border border-transparent hover:bg-gray-100"
              }`}
            >
              <span className="text-sm font-medium text-gray-800">
                {c.title}
              </span>
              <span className="font-mono text-[11px] text-gray-400">
                {c.id.slice(0, 8)}...
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
