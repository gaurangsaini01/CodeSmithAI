import { useMemo, useState } from "react";
import {
  useGetChatHistoryInfiniteQuery,
  useSendChatMutation,
} from "../services/chatApi";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import Composer from "./Composer";

type Props = {
  userName: string;
  userEmail?: string;
  chatId: string;
  title: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
};

export default function ChatWindow({
  userName,
  userEmail,
  chatId,
  title,
  onToggleSidebar,
  onLogout,
}: Props) {
  const {
    currentData,
    isError,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetChatHistoryInfiniteQuery({ chatId });

  // `currentData` is undefined while a newly-selected chat's history loads, so
  // switching chats shows the loader instead of the previous chat's messages.
  const messages = useMemo(
    () => (currentData ? [...currentData.pages].reverse().flat() : []),
    [currentData],
  );
  const isLoadingHistory = isFetching && !currentData;

  const [sendChat, { isLoading: isSending }] = useSendChatMutation();
  const [draft, setDraft] = useState("");

  async function handleSend(text: string) {
    try {
      await sendChat({ query: text, chat_id: chatId }).unwrap();
    } catch {
      // Errors surface via RTK state; the optimistic patch self-reverts.
    }
  }

  const busy = isFetching || isSending;

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-surface">
      <ChatHeader
        title={title}
        userName={userName}
        userEmail={userEmail}
        onToggleSidebar={onToggleSidebar}
        onLogout={onLogout}
      />
      <div className="h-0.5">{busy && <div className="progress-line" />}</div>
      <MessageList
        messages={messages}
        isLoading={isLoadingHistory}
        isError={isError}
        isSending={isSending}
        hasMore={hasNextPage}
        isFetchingOlder={isFetchingNextPage}
        onLoadOlder={fetchNextPage}
        onSuggestion={setDraft}
      />
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        disabled={isSending}
      />
    </main>
  );
}
