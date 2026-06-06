import type { ChatMessage } from "../services/chatApi";
import Markdown from "./Markdown";
import BrandLogo from "./BrandLogo";

type Props = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="max-w-[80%] self-end rounded-lg bg-surface-container-high px-4 py-2.5 text-[15px] leading-7 text-on-surface [overflow-wrap:anywhere]">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full gap-3 self-start md:max-w-[88%]">
      <BrandLogo className="mt-0.5 h-7 w-7" />
      <div className="bubble-ai min-w-0 flex-1 text-[15px] leading-7 text-on-surface [overflow-wrap:anywhere]">
        <Markdown content={message.content} />
      </div>
    </div>
  );
}
