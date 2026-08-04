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
  documentId?: string;
  attachmentName?: string;
};

export type SendChatResponse = {
  output: string;
};

export type DocumentStatus =
  | "uploaded"
  | "parsing"
  | "embedding"
  | "ready"
  | "failed"
  | "cancelled";

export type UserDocument = {
  id: string;
  original_name: string;
  status: DocumentStatus;
  page_count: number | null;
  chunk_count: number | null;
  error: string | null;
  created_at: string;
};

export type SendDocumentRequest = {
  file: File;
  documentId: string;
};

// fetch() cannot report upload progress, so the upload uses XMLHttpRequest and
// pushes progress to whoever registered a handler for that document id. The
// handler is kept out of the mutation argument so Redux never sees a function
// inside a dispatched action.
const uploadProgressHandlers = new Map<string, (fraction: number) => void>();

export function setUploadProgressHandler(
  documentId: string,
  handler: ((fraction: number) => void) | undefined,
) {
  if (handler) {
    uploadProgressHandlers.set(documentId, handler);
  } else {
    uploadProgressHandlers.delete(documentId);
  }
}

function readStoredToken(): string | null {
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

type UploadResult = { data: UserDocument } | { error: FetchBaseQueryError };

function uploadWithProgress(
  file: File,
  documentId: string,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.append("document_id", documentId);
    body.append("file", file);

    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/document`);

    const token = readStoredToken();
    if (token) {
      request.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const handler = uploadProgressHandlers.get(documentId);
      if (handler) handler(event.loaded / event.total);
    };

    request.onload = () => {
      const parsed = parseJsonOrNull(request.responseText);

      if (request.status >= 200 && request.status < 300) {
        resolve({ data: parsed as UserDocument });
      } else {
        resolve({ error: { status: request.status, data: parsed } });
      }
    };

    request.onerror = () => {
      resolve({
        error: { status: "FETCH_ERROR", error: "Could not reach the server." },
      });
    };

    request.send(body);
  });
}

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
  tagTypes: ["ChatHistory", "UserChats", "Documents"],
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
      query: ({ query, chat_id, documentId }) => {
        const body = new FormData();
        body.append("query", query);
        body.append("chat_id", chat_id);
        if (documentId) body.append("document_id", documentId);

        return { url: "/chat", method: "POST", body };
      },

      async onQueryStarted(
        { query, chat_id, attachmentName },
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
                content: attachmentName
                  ? `${query}\n\nAttached: ${attachmentName}`.trim()
                  : query,
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
    sendDocument: builder.mutation<UserDocument, SendDocumentRequest>({
      async queryFn({ file, documentId }, api) {
        const result = await uploadWithProgress(file, documentId);

        // queryFn bypasses baseQueryWithAuth, so the sign-out on an expired
        // token has to be repeated here.
        if ("error" in result) {
          const status = result.error.status;
          if (status === 401 || status === 403) {
            api.dispatch(clearToken());
            api.dispatch(clearUser());
          }
        }
        return result;
      },
      invalidatesTags: ["Documents"],
    }),
    getDocumentStatus: builder.query<UserDocument, string>({
      query: (documentId) => `/document/${documentId}`,
      providesTags: (_result, _error, documentId) => [
        { type: "Documents", id: documentId },
      ],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (documentId) => ({
        url: `/document/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, documentId) => [
        { type: "Documents", id: documentId },
        "Documents",
      ],
    }),
  }),
});

export const {
  useGetUserChatsQuery,
  useGetChatHistoryInfiniteQuery,
  useSendChatMutation,
  useGetDocumentStatusQuery,
  useDeleteDocumentMutation,
  useSendDocumentMutation,
} = chatApi;
