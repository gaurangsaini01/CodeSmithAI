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
      <p className="px-2 text-xs text-on-surface-variant">
        No chats yet. Click "New Chat" to start.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((c) => {
        const active = c.id === activeChatId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center rounded-md px-3 py-2.5 text-left text-sm transition ${
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <span className="truncate">{c.title}</span>
          </button>
        );
      })}
    </div>
  );
}
