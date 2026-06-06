import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { clearToken, clearUser } from "../store/authSlice";
import { chatApi, useGetUserChatsQuery } from "../services/chatApi";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import ConfirmModal from "../components/ConfirmModal";

export default function ChatPage() {
  const user = useSelector((s: RootState) => s.auth.user)!;
  const dispatch = useDispatch<AppDispatch>();

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.matchMedia("(min-width: 768px)").matches,
  );

  const [confirmLogout, setConfirmLogout] = useState(false);

  function closeSidebarOnMobile() {
    if (window.matchMedia("(max-width: 767px)").matches) setSidebarOpen(false);
  }

  const { data: conversations = [] } = useGetUserChatsQuery(undefined);

  useEffect(() => {
    handleNewChat();
  }, []);

  function handleNewChat() {
    setActiveChatId(crypto.randomUUID());
    closeSidebarOnMobile();
  }

  function handleSelectChat(id: string) {
    setActiveChatId(id);
    closeSidebarOnMobile();
  }

  function requestLogout() {
    setConfirmLogout(true);
  }

  function handleLogout() {
    setConfirmLogout(false);
    dispatch(clearUser());
    dispatch(clearToken());
    dispatch(chatApi.util.resetApiState());
  }

  const activeTitle =
    conversations.find((c) => c.id === activeChatId)?.title ?? "New Chat";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        conversations={conversations}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onLogout={requestLogout}
      />
      {activeChatId ? (
        <ChatWindow
          userName={user.name}
          userEmail={user.email}
          chatId={activeChatId}
          title={activeTitle}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onLogout={requestLogout}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-on-surface-variant">
          Loading…
        </div>
      )}

      <ConfirmModal
        open={confirmLogout}
        title="Sign out?"
        message="You'll need to log in again to access your chats."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
