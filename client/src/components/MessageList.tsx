import { useEffect, useRef } from "react";
import type { ChatMessage } from "../services/chatApi";
import MessageBubble from "./MessageBubble";

type Props = {
  messages: ChatMessage[];
  isLoading: boolean;
  isError: boolean;
  isSending: boolean;
};

export default function MessageList({
  messages,
  isLoading,
  isError,
  isSending,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
      {isLoading ? (
        <div className="m-auto text-sm text-gray-400">Loading messages...</div>
      ) : isError ? (
        <div className="m-auto text-sm text-red-500">
          History didn't load . Please try again after some time.
        </div>
      ) : messages.length === 0 ? (
        <div className="m-auto text-sm text-gray-400">
          What Can I Help You Today?
        </div>
      ) : (
        messages.map((m) => <MessageBubble key={m.id} message={m} />)
      )}

      {isSending && (
        <div className="max-w-[70%] self-start rounded-2xl rounded-bl-sm bg-gray-100 px-3.5 py-2.5 text-sm italic text-gray-400">
          ...thinking
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
