import type { Conversation } from "../types";
import ConversationList from "./ConversationList";
import BrandLogo from "./BrandLogo";
import SettingsMenu from "./SettingsMenu";

type Props = {
  open: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  open,
  onToggle,
  conversations,
  activeChatId,
  onNewChat,
  onSelectChat,
  onLogout,
}: Props) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-full shrink-0 overflow-hidden border-r border-outline-variant bg-surface-container-low transition-transform duration-200 md:static md:z-auto md:transition-[width] ${
        open
          ? "translate-x-0 md:w-sidebar"
          : "-translate-x-full md:w-0 md:translate-x-0"
      }`}
    >
      <div className="flex h-full w-full flex-col p-4 md:w-sidebar md:p-3">
        <div className="mb-5 flex items-center justify-between px-1 pt-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo className="glow-primary h-9 w-9" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-base font-semibold text-on-surface">
                Halo
              </div>
              <div className="truncate type-label-md text-on-surface-variant">
                Your intelligent halo
              </div>
            </div>
          </div>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
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

        <button
          onClick={onNewChat}
          className="glow-primary cursor-pointer mb-5 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 type-label-md text-on-primary transition hover:brightness-110"
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

        <p className="mb-2 px-2 type-label-md uppercase tracking-wider text-on-surface-variant/80">
          History
        </p>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          <ConversationList
            conversations={conversations}
            activeChatId={activeChatId}
            onSelect={onSelectChat}
          />
        </div>

        <div className="mt-3 border-t border-outline-variant pt-3">
          <SettingsMenu onSignOut={onLogout} />
        </div>
      </div>
    </aside>
  );
}
