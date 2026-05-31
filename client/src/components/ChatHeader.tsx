type Props = {
  title: string;
  chatId: string;
  onToggleSidebar: () => void;
};

export default function ChatHeader({ title, chatId, onToggleSidebar }: Props) {
  return (
    <header className="flex items-center gap-3 border-b border-gray-200 px-5 py-3.5">
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
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
      <div className="min-w-0">
        <div className="truncate text-base font-semibold text-gray-800">
          {title}
        </div>
        <div className="mt-0.5 truncate text-xs text-gray-400">
          conv_id: <code className="font-mono text-[11px]">{chatId}</code>
        </div>
      </div>
    </header>
  );
}
