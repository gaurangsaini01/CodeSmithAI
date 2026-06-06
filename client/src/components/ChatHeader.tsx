import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

type Props = {
  title: string;
  userName: string;
  userEmail?: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
};

export default function ChatHeader({
  title,
  userName,
  userEmail,
  onToggleSidebar,
  onLogout,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b border-outline-variant px-5 py-3">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-on-surface">
          {title}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative">
          {menuOpen && (
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            title={userName}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-container-high text-sm font-semibold text-on-surface ring-1 ring-outline-variant transition hover:brightness-105"
          >
            {userName.charAt(0).toUpperCase()}
          </button>

          {menuOpen && (
            <div className="glass absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-lg p-1.5">
              <div className="px-2.5 py-2">
                <p className="truncate text-sm font-medium text-on-surface">
                  {userName}
                </p>
                {userEmail && (
                  <p className="truncate type-label-md text-on-surface-variant">
                    {userEmail}
                  </p>
                )}
              </div>
              <div className="my-1 h-px bg-outline-variant" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-on-surface transition hover:bg-error-container hover:text-on-error-container"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
