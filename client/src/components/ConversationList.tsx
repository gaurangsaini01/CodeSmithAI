import type { Conversation } from "../types";

type Props = {
  conversations: Conversation[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
};

export default function ConversationList({
  conversations,
  activeChatId,
  onSelect,
}: Props) {
  if (conversations.length === 0) {
    return (
      <p className="px-1 text-xs text-gray-400">
        No chats yet. Click "New Chat" to start.
      </p>
    );
  }

  return (
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
            <span className="truncate text-sm font-medium text-gray-800">
              {c.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
