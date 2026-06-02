import type { ChatMessage } from "../services/chatApi";
import Markdown from "./Markdown";

type Props = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`min-w-0 max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
        isUser
          ? "self-end rounded-br-sm bg-violet-600 text-white"
          : "self-start rounded-bl-sm bg-gray-100 text-gray-800"
      }`}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap">{message.content}</p>
      ) : (
        <Markdown content={message.content} />
      )}
    </div>
  );
}
