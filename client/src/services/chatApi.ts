import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { Conversation } from "../types";
import { clearToken, clearUser } from "../store/authSlice";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const PAGE_SIZE = 10;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type SendChatRequest = {
  query: string;
  chat_id: string;
  file?: File;
};

export type SendChatResponse = {
  output: string;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE,
  prepareHeaders: (headers) => {
    const raw = localStorage.getItem("token");
    if (raw) {
      try {
        const token = JSON.parse(raw);
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch {
        /* malformed token in storage */
      }
    }
    return headers;
  },
});

// A 401 (missing/expired/invalid token) or 403 (not your resource) signs the
// user out; clearing the token makes ProtectedRoute redirect to /login.
const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (
    result.error &&
    (result.error.status === 401 || result.error.status === 403)
  ) {
    api.dispatch(clearToken());
    api.dispatch(clearUser());
    // Defer so the failing request finishes settling before the cache is wiped.
    setTimeout(() => api.dispatch(chatApi.util.resetApiState()), 0);
  }
  return result;
};

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["ChatHistory", "UserChats"],
  endpoints: (builder) => ({
    getUserChats: builder.query<Conversation[], undefined>({
      query: () => `/chats`,
      providesTags: ["UserChats"],
    }),

    getChatHistory: builder.infiniteQuery<
      ChatMessage[],
      { chatId: string },
      string | null
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) =>
          lastPage.length < PAGE_SIZE ? undefined : lastPage[0].created_at,
      },
      query: ({ queryArg: { chatId }, pageParam }) => {
        const base = `/get-chat-history/${chatId}`;
        return pageParam
          ? `${base}?cursor=${encodeURIComponent(pageParam)}`
          : base;
      },
      providesTags: (_result, _error, { chatId }) => [
        { type: "ChatHistory", id: chatId },
      ],
    }),

    sendChat: builder.mutation<SendChatResponse, SendChatRequest>({
      query: ({ query, chat_id, file }) => {
        const body = new FormData();
        body.append("query", query);
        body.append("chat_id", chat_id);
        if (file) body.append("file", file);

        return { url: "/chat", method: "POST", body };
      },

      async onQueryStarted(
        { query, chat_id, file },
        { dispatch, queryFulfilled },
      ) {
        const patch = dispatch(
          chatApi.util.updateQueryData(
            "getChatHistory",
            { chatId: chat_id },
            (draft) => {
              draft.pages[0]?.push({
                id: `optimistic-user-${Date.now()}`,
                role: "user",
                content: file ? `${query}\n\nAttached: ${file.name}`.trim() : query,
                created_at: new Date().toISOString(),
              });
            },
          ),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            chatApi.util.updateQueryData(
              "getChatHistory",
              { chatId: chat_id },
              (draft) => {
                draft.pages[0]?.push({
                  id: `assistant-${Date.now()}`,
                  role: "assistant",
                  content: data.output,
                  created_at: new Date().toISOString(),
                });
              },
            ),
          );
        } catch {
          patch.undo();
        }
      },

      invalidatesTags: ["UserChats"],
    }),
  }),
});

export const {
  useGetUserChatsQuery,
  useGetChatHistoryInfiniteQuery,
  useSendChatMutation,
} = chatApi;
