from pathlib import Path

import pymupdf

from app.config import settings

# Below this much extracted text we treat the PDF as having no text layer at
# all, rather than embedding whitespace and silently returning nothing later.
MIN_TEXT_CHARS = 32


class PdfError(Exception):
    """Ingestion failure with a message safe to show the end user."""


class EncryptedPdfError(PdfError):
    pass


class NoTextLayerError(PdfError):
    pass


class TooManyPagesError(PdfError):
    pass


def extract_pages(path: Path) -> tuple[list[tuple[int, str]], int]:
    """Return [(page_number, text), ...] for pages that carry text, plus the
    document's total page count. Page numbers are 1-based."""
    try:
        doc = pymupdf.open(path)
    except Exception as exc:
        raise PdfError("This file could not be opened as a PDF.") from exc

    try:
        if doc.needs_pass:
            raise EncryptedPdfError(
                "This PDF is password protected. Remove the password and upload it again."
            )

        page_count = doc.page_count
        if page_count > settings.max_pdf_pages:
            raise TooManyPagesError(
                f"This PDF has {page_count} pages; the limit is {settings.max_pdf_pages}."
            )

        pages: list[tuple[int, str]] = []
        total_chars = 0
        for index in range(page_count):
            try:
                text = doc.load_page(index).get_text("text")
            except Exception:
                # One malformed page shouldn't lose the other pages.
                continue
            text = text.strip()
            if not text:
                continue
            total_chars += len(text)
            pages.append((index + 1, text))

        if total_chars < MIN_TEXT_CHARS:
            raise NoTextLayerError(
                "No readable text found in this PDF. It looks like a scan or "
                "image-only document, which isn't supported yet."
            )

        return pages, page_count
    finally:
        doc.close()
