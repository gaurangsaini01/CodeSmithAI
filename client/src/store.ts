import { configureStore } from "@reduxjs/toolkit";
import { chatApi } from "./services/chatApi";
import { authApi } from "./services/authApi";
import authReducer from "./store/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [chatApi.reducerPath]: chatApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(chatApi.middleware, authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
