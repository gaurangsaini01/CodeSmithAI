import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../store";
import { toggleTheme } from "../store/themeSlice";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const theme = useSelector((s: RootState) => s.theme.theme);
  const dispatch = useDispatch<AppDispatch>();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleTheme())}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface cursor-pointer ${className}`}
    >
      {isDark ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
