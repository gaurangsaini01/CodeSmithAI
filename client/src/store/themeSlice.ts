import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem("chat_theme");
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return saved;
    }
  } catch {
    /* ignore unavailable storage */
  }
  const prefersDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const theme: Theme = prefersDark ? "dark" : "light";
  applyTheme(theme);
  return theme;
}

const themeSlice = createSlice({
  name: "theme",
  initialState: { theme: loadTheme() },
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      localStorage.setItem("chat_theme", action.payload);
      applyTheme(action.payload);
    },
    toggleTheme(state) {
      const next: Theme = state.theme === "dark" ? "light" : "dark";
      state.theme = next;
      localStorage.setItem("chat_theme", next);
      applyTheme(next);
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
