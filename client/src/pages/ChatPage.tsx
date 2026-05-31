import { useState } from "react";
import { USERS, CONVERSATIONS } from "../data/mockData";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const [userId, setUserId] = useState<number>(USERS[0].id);
  const [activeChatId, setActiveChatId] = useState<string>(
    CONVERSATIONS[USERS[0].id][0].id,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const conversations = CONVERSATIONS[userId];
  const activeConv = conversations.find((c) => c.id === activeChatId);

  function handleUserChange(newUserId: number) {
    setUserId(newUserId);
    // Conversations are user-specific -> jump to this user's first chat.
    setActiveChatId(CONVERSATIONS[newUserId][0].id);
  }

  function toggleSidebar() {
    setSidebarOpen((open) => !open);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-800">
      <Sidebar
        open={sidebarOpen}
        onToggle={toggleSidebar}
        userId={userId}
        conversations={conversations}
        activeChatId={activeChatId}
        onUserChange={handleUserChange}
        onSelectChat={setActiveChatId}
      />
      <ChatWindow
        userId={userId}
        chatId={activeChatId}
        title={activeConv?.title ?? ""}
        onToggleSidebar={toggleSidebar}
      />
    </div>
  );
}
