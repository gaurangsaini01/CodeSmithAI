export type AttachmentPhase =
  | "uploading"
  | "queued"
  | "parsing"
  | "embedding"
  | "ready"
  | "upload_failed"
  | "failed";

type Props = {
  fileName: string;
  phase: AttachmentPhase;
  progressPercent: number;
  headline: string;
  detail: string;
  onRetry: () => void;
  onRemove: () => void;
};

const STEPS: { phase: AttachmentPhase; label: string }[] = [
  { phase: "uploading", label: "Upload" },
  { phase: "parsing", label: "Read" },
  { phase: "embedding", label: "Index" },
  { phase: "ready", label: "Ready" },
];

function stepIndexFor(phase: AttachmentPhase): number {
  if (phase === "uploading") return 0;
  if (phase === "queued") return 0;
  if (phase === "parsing") return 1;
  if (phase === "embedding") return 2;
  if (phase === "ready") return 3;
  return 0;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin text-primary"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FailedIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-error"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export default function AttachmentChip({
  fileName,
  phase,
  progressPercent,
  headline,
  detail,
  onRetry,
  onRemove,
}: Props) {
  const isFailed = phase === "upload_failed" || phase === "failed";
  const isReady = phase === "ready";
  const isBusy = !isFailed && !isReady;
  const currentStep = stepIndexFor(phase);

  let barColor = "bg-primary";
  if (isFailed) barColor = "bg-error";

  return (
    <div className="mx-auto mt-2 max-w-7xl rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        {isBusy && <Spinner />}
        {isReady && <ReadyIcon />}
        {isFailed && <FailedIcon />}

        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-on-surface">
            {fileName}
          </span>
          <span
            className={
              isFailed
                ? "block truncate text-xs text-error"
                : "block truncate text-xs text-on-surface-variant"
            }
          >
            {headline}
          </span>
        </div>

        <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">
          {detail}
        </span>

        {isFailed && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-on-surface transition hover:bg-surface-container-high"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="shrink-0 rounded-md px-2 py-1 text-xs text-on-surface transition hover:bg-surface-container-high"
        >
          Remove
        </button>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {!isFailed && (
        <div className="mt-1.5 flex justify-between">
          {STEPS.map((step, index) => {
            let stepColor = "text-on-surface-variant/50";
            if (index < currentStep) stepColor = "text-on-surface-variant";
            if (index === currentStep) stepColor = "text-primary";

            return (
              <span key={step.phase} className={`text-[10px] ${stepColor}`}>
                {step.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
