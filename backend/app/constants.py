ROLES = {
    'user':'User',
    'ai':'Assistant'
}

DOC_STATUS = {
    "uploaded": "uploaded",
    "parsing": "parsing",
    "embedding": "embedding",
    "ready": "ready",
    "failed": "failed",
    "cancelled": "cancelled",
}

# Once a document reaches one of these the ingest job must not write any more.
DOC_TERMINAL_STATUSES = {
    DOC_STATUS["ready"],
    DOC_STATUS["failed"],
    DOC_STATUS["cancelled"],
}

INGEST_DOCUMENT_JOB = "ingest_document"
