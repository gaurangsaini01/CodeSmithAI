import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import {
  chatApi,
  setUploadProgressHandler,
  useDeleteDocumentMutation,
  useGetDocumentStatusQuery,
  useSendDocumentMutation,
} from "../services/chatApi";
import type { DocumentStatus } from "../services/chatApi";
import AttachmentChip from "./AttachmentChip";
import type { AttachmentPhase } from "./AttachmentChip";

// Measured on this pipeline: ingestion is 2-5s and barely varies with page
// count, so these thresholds flag "something is wrong" rather than estimate.
const SLOW_AFTER_SECONDS = 12;
const PROBABLY_STUCK_AFTER_SECONDS = 40;

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: (text: string, documentId?: string, attachmentName?: string) => void;
  disabled: boolean;
};

type Attachment = {
  file: File;
  documentId: string;
  startedAt: number;
};

function isTerminalStatus(status: DocumentStatus): boolean {
  return status === "ready" || status === "failed" || status === "cancelled";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function readErrorDetail(
  error: FetchBaseQueryError | SerializedError | undefined,
): string {
  if (error && "data" in error) {
    const data = error.data;
    if (
      data !== null &&
      typeof data === "object" &&
      "detail" in data &&
      typeof data.detail === "string"
    ) {
      return data.detail;
    }
  }
  return "Something went wrong.";
}

export default function Composer({ value, onChange, onSend, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<Attachment | undefined>();
  const [uploadFraction, setUploadFraction] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const [uploadDocument, uploadResult] = useSendDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  const canQueryStatus = attachment !== undefined && uploadResult.isSuccess;
  const statusQueryArg = canQueryStatus ? attachment.documentId : skipToken;

  // Peek at the cached status before subscribing, so polling can be switched
  // off in the same render that a terminal status arrives in.
  const cachedDocument =
    chatApi.endpoints.getDocumentStatus.useQueryState(statusQueryArg).data;
  const hasFinishedProcessing =
    cachedDocument !== undefined && isTerminalStatus(cachedDocument.status);

  const statusQuery = useGetDocumentStatusQuery(statusQueryArg, {
    pollingInterval: hasFinishedProcessing ? 0 : 1500,
  });
  const documentData = statusQuery.data;

  function getAttachmentPhase(): AttachmentPhase {
    if (uploadResult.isError) return "upload_failed";
    if (!uploadResult.isSuccess) return "uploading";
    if (!documentData) return "queued";
    if (documentData.status === "uploaded") return "queued";
    if (documentData.status === "parsing") return "parsing";
    if (documentData.status === "embedding") return "embedding";
    if (documentData.status === "ready") return "ready";
    return "failed";
  }

  const phase = attachment ? getAttachmentPhase() : undefined;
  const isAttachmentReady = phase === "ready";
  const isAttachmentFailed = phase === "upload_failed" || phase === "failed";
  const isAttachmentBusy =
    phase !== undefined && !isAttachmentReady && !isAttachmentFailed;

  useEffect(() => {
    if (!attachment || !isAttachmentBusy) return;

    const startedAt = attachment.startedAt;
    const timer = setInterval(() => {
      setSecondsElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [attachment, isAttachmentBusy]);

  function getProgressPercent(): number {
    if (phase === "uploading") return Math.round(uploadFraction * 35);
    if (phase === "queued") return 45;
    if (phase === "parsing") return 65;
    if (phase === "embedding") return 85;
    return 100;
  }

  function getHeadline(): string {
    if (phase === "uploading") return "Uploading your file";
    if (phase === "queued") return "Queued for processing";
    if (phase === "parsing") return "Reading the pages";
    if (phase === "embedding") return "Indexing for search";
    if (phase === "ready") return "Ready — ask a question about it";
    if (phase === "upload_failed") {
      return `Upload failed: ${readErrorDetail(uploadResult.error)}`;
    }
    if (documentData && documentData.error) return documentData.error;
    return "Could not process this PDF";
  }

  function getDetail(): string {
    if (phase === "uploading") {
      const uploadedBytes = (attachment?.file.size ?? 0) * uploadFraction;
      return `${formatFileSize(uploadedBytes)} of ${formatFileSize(attachment?.file.size ?? 0)}`;
    }

    if (phase === "ready") {
      if (!documentData) return "";
      const pages = documentData.page_count ?? 0;
      const sections = documentData.chunk_count ?? 0;
      return `${pages} pages · ${sections} sections`;
    }

    if (isAttachmentFailed) return "";

    if (secondsElapsed >= PROBABLY_STUCK_AFTER_SECONDS) {
      return "Still working — is the worker running?";
    }
    if (secondsElapsed >= SLOW_AFTER_SECONDS) {
      return `Longer than usual · ${secondsElapsed}s`;
    }
    return `about 5s · ${secondsElapsed}s elapsed`;
  }

  function startUpload(file: File) {
    const documentId = crypto.randomUUID();
    setUploadFraction(0);
    setSecondsElapsed(0);
    setUploadProgressHandler(documentId, setUploadFraction);
    setAttachment({ file, documentId, startedAt: Date.now() });
    uploadDocument({ file, documentId });
  }

  function clearAttachment() {
    if (attachment) setUploadProgressHandler(attachment.documentId, undefined);
    setAttachment(undefined);
    setUploadFraction(0);
    uploadResult.reset();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachment) deleteDocument(attachment.documentId);
    startUpload(file);
  }

  function handleRemoveAttachment() {
    if (!attachment) return;
    deleteDocument(attachment.documentId);
    clearAttachment();
  }

  function handleRetryUpload() {
    if (!attachment) return;
    if (documentData) deleteDocument(attachment.documentId);
    startUpload(attachment.file);
  }

  function submit() {
    const text = value.trim();
    if (disabled || isAttachmentBusy) return;
    if (!text && !isAttachmentReady) return;

    if (attachment && isAttachmentReady) {
      onSend(text, attachment.documentId, attachment.file.name);
      clearAttachment();
    } else {
      onSend(text);
    }
    onChange("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const isSendDisabled =
    disabled || isAttachmentBusy || (!value.trim() && !isAttachmentReady);

  return (
    <div className="border-t border-outline-variant bg-surface px-4 py-4 md:px-5">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative flex items-end gap-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-2 py-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="sr-only"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach file"
            title={attachment ? attachment.file.name : "Attach file"}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <textarea
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Halo…"
            className="max-h-44 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-6 text-on-surface outline-none placeholder:text-on-surface-variant/60"
          />

          <button
            onClick={submit}
            disabled={isSendDisabled}
            aria-label="Send message"
            className="glow-primary mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        {attachment && phase && (
          <AttachmentChip
            fileName={attachment.file.name}
            phase={phase}
            progressPercent={getProgressPercent()}
            headline={getHeadline()}
            detail={getDetail()}
            onRetry={handleRetryUpload}
            onRemove={handleRemoveAttachment}
          />
        )}
        <p className="mt-2 text-center text-xs text-on-surface-variant/70">
          Halo can make mistakes. Consider verifying important information.
        </p>
      </div>
    </div>
  );
}
