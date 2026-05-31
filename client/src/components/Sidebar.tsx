import type { Conversation } from "../types";
import UserSelect from "./UserSelect";
import ConversationList from "./ConversationList";

type Props = {
  open: boolean;
  onToggle: () => void;
  userId: number;
  conversations: Conversation[];
  activeChatId: string;
  onUserChange: (id: number) => void;
  onSelectChat: (id: string) => void;
};

export default function Sidebar({
  open,
  onToggle,
  userId,
  conversations,
  activeChatId,
  onUserChange,
  onSelectChat,
}: Props) {
  return (
    <aside
      className={`shrink-0 overflow-hidden border-r border-gray-200 bg-gray-50 transition-[width] duration-200 ${
        open ? "w-72" : "w-0"
      }`}
    >
      <div className="flex h-full w-72 flex-col gap-6 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Chats</span>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        <UserSelect userId={userId} onChange={onUserChange} />
        <ConversationList
          conversations={conversations}
          activeChatId={activeChatId}
          onSelect={onSelectChat}
        />
      </div>
    </aside>
  );
}
