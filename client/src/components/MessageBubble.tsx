import type { ChatMessage } from "../services/chatApi";

type Props = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`max-w-[70%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? "self-end rounded-br-sm bg-violet-600 text-white"
          : "self-start rounded-bl-sm bg-gray-100 text-gray-800"
      }`}
    >
      {message.content}
    </div>
  );
}
