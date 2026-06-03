import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Conversation } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SendChatRequest = {
  query: string;
  user_id: string;
  chat_id: string;
};

export type SendChatResponse = {
  output: string;
};

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: fetchBaseQuery({ baseUrl: API_BASE }),
  tagTypes: ["ChatHistory", "UserChats"],
  endpoints: (builder) => ({
    getUserChats: builder.query<Conversation[], { userId: string }>({
      query: ({ userId }) => `/chats/${userId}`,
      providesTags: (_result, _error, { userId }) => [
        { type: "UserChats", id: userId },
      ],
    }),

    getChatHistory: builder.query<
      ChatMessage[],
      { chatId: string; userId: string }
    >({
      query: ({ chatId, userId }) => `/get-chat-history/${chatId}/${userId}`,
      providesTags: (_result, _error, { chatId }) => [
        { type: "ChatHistory", id: chatId },
      ],
    }),

    sendChat: builder.mutation<SendChatResponse, SendChatRequest>({
      query: (body) => ({ url: "/chat", method: "POST", body }),

      // Optimistically show the user's message immediately. After the request
      // succeeds, invalidation refetches the real persisted history (user msg
      // + assistant reply). On failure, the optimistic patch is reverted.
      async onQueryStarted(
        { query, user_id, chat_id },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          chatApi.util.updateQueryData(
            "getChatHistory",
            { chatId: chat_id, userId: user_id },
            (draft) => {
              draft.push({
                id: `optimistic-${Date.now()}`,
                role: "user",
                content: query,
                created_at: new Date().toISOString(),
              });
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },

      // Refresh chat history + sidebar (new chat appears in list after first message).
      invalidatesTags: (_result, _error, { chat_id, user_id }) => [
        { type: "ChatHistory", id: chat_id },
        { type: "UserChats", id: user_id },
      ],
    }),
  }),
});

export const {
  useGetUserChatsQuery,
  useGetChatHistoryQuery,
  useSendChatMutation,
} = chatApi;
