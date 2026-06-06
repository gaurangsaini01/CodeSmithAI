export default function BrandLogo({
  className = "h-9 w-9",
}: {
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-tertiary text-white ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-[58%] w-[58%]"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}
