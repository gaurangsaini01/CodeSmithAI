import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  token?: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
};

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("chat_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function loadToken(): AuthUser | null {
  try {
    const raw = localStorage.getItem("token");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: { user: loadUser(), token: loadToken() } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      localStorage.setItem("chat_user", JSON.stringify(action.payload));
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem("token", JSON.stringify(action.payload));
    },
    clearToken(state) {
      state.token = null;
      localStorage.removeItem("token");
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem("chat_user");
    },
  },
});

export const { setUser, clearUser, setToken, clearToken } = authSlice.actions;
export default authSlice.reducer;
