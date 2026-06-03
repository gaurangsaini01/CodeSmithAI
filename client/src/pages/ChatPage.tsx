import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { clearUser } from "../store/authSlice";
import { useGetUserChatsQuery } from "../services/chatApi";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const user = useSelector((s: RootState) => s.auth.user)!;
  const dispatch = useDispatch<AppDispatch>();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: conversations = [] } = useGetUserChatsQuery({ userId: user?.id });

  // Auto-select the most recent chat on first load.
  useEffect(() => {
    if (conversations.length > 0 && !activeChatId) {
      setActiveChatId(conversations[0].id);
    }
  }, [conversations, activeChatId]);

  function handleNewChat() {
    setActiveChatId(crypto.randomUUID());
  }

  function handleLogout() {
    dispatch(clearUser());
  }

  const activeTitle =
    conversations.find((c) => c.id === activeChatId)?.title ?? "New Chat";

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        userName={user?.name}
        conversations={conversations}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={setActiveChatId}
        onLogout={handleLogout}
      />
      {activeChatId ? (
        <ChatWindow
          userId={user.id}
          chatId={activeChatId}
          title={activeTitle}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          Click "New Chat" to start a conversation.
        </div>
      )}
    </div>
  );
}
