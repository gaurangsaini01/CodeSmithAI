import type { ReactNode } from "react";
import ThemeToggle from "../ThemeToggle";
import BrandLogo from "../BrandLogo";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary opacity-10 blur-[120px] dark:opacity-25"
      />

      <ThemeToggle className="absolute right-5 top-5 z-10" />

      <div className="glass relative z-10 w-full max-w-md rounded-xl p-8">
        <div className="mb-8 text-center">
          <BrandLogo className="glow-primary mx-auto mb-3 h-12 w-12" />
          <p className="mb-4 type-label-md text-on-surface-variant">
            Halo · Your intelligent halo
          </p>
          <h1 className="type-headline-md text-on-surface">{title}</h1>
          <p className="mt-1.5 type-body-md text-on-surface-variant">
            {subtitle}
          </p>
        </div>
        {children}
        <div className="mt-7 text-center text-sm text-on-surface-variant">
          {footer}
        </div>
      </div>
    </div>
  );
}
