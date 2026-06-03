import type { Conversation } from "../types";
import ConversationList from "./ConversationList";

type Props = {
  open: boolean;
  onToggle: () => void;
  userName: string;
  conversations: Conversation[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  open,
  onToggle,
  userName,
  conversations,
  activeChatId,
  onNewChat,
  onSelectChat,
  onLogout,
}: Props) {
  return (
    <aside
      className={`shrink-0 overflow-hidden border-r border-gray-200 bg-gray-50 transition-[width] duration-200 ${
        open ? "w-72" : "w-0"
      }`}
    >
      <div className="flex h-full w-72 flex-col p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
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

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-700 transition hover:bg-violet-100"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            activeChatId={activeChatId}
            onSelect={onSelectChat}
          />
        </div>

        {/* User Info + Logout */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium text-gray-700">
              {userName}
            </span>
          </div>
          <button
            onClick={onLogout}
            aria-label="Logout"
            className="ml-2 shrink-0 rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
