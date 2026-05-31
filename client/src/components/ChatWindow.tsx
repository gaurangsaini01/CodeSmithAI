import {
  useGetChatHistoryQuery,
  useSendChatMutation,
} from "../services/chatApi";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import Composer from "./Composer";

type Props = {
  userId: number;
  chatId: string;
  title: string;
  onToggleSidebar: () => void;
};

export default function ChatWindow({
  userId,
  chatId,
  title,
  onToggleSidebar,
}: Props) {
  const {
    data: messages = [],
    isLoading,
    isError,
  } = useGetChatHistoryQuery({ chatId, userId });
  const [sendChat, { isLoading: isSending }] = useSendChatMutation();

  async function handleSend(text: string) {
    try {
      await sendChat({ query: text, user_id: userId, chat_id: chatId }).unwrap();
    } catch {
      // Errors surface via RTK state; the optimistic patch self-reverts.
    }
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <ChatHeader
        title={title}
        chatId={chatId}
        onToggleSidebar={onToggleSidebar}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isError={isError}
        isSending={isSending}
      />
      <Composer onSend={handleSend} disabled={isSending} />
    </main>
  );
}
