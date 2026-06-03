import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
};

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("chat_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const authSlice = createSlice({
  name: "auth",
  initialState: { user: loadUser() } as AuthState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      localStorage.setItem("chat_user", JSON.stringify(action.payload));
    },
    clearUser(state) {
      state.user = null;
      localStorage.removeItem("chat_user");
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
