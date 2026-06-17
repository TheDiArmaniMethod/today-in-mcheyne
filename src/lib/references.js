import { CANONICAL_BOOK_BY_FILENAME, getBookFilename } from "../data/books";

export function normalizeReference(reference) {
  return reference
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ");
}

function normalizeBookName(bookName) {
  const filename = getBookFilename(bookName);
  return filename ? CANONICAL_BOOK_BY_FILENAME[filename] : bookName.trim();
}

export function parsePassageReference(reference) {
  const normalizedReference = normalizeReference(reference);
  const parts = normalizedReference.split(",").map((part) => part.trim());

  if (parts.length > 1) {
    const firstPart = parts[0];
    const match = firstPart.match(/^(\d?\s?[A-Za-z\s]+?)\s+(\d+)(?:-\d+)?(?::\d+(?:-\d+)?)?$/);

    if (!match) {
      return null;
    }

    const book = normalizeBookName(match[1]);

    const subRefs = parts.map((part) => {
      let sub = part;

      if (part === firstPart) {
        sub = part
          .replace(new RegExp(`^${match[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "")
          .trim();
      }

      const subMatch = sub.match(/^(\d+)(?:-\d+)?(?::(\d+)(?:-(\d+))?)?$/);

      if (!subMatch) {
        return null;
      }

      const chapter = Number.parseInt(subMatch[1], 10);
      const startVerse = subMatch[2] ? Number.parseInt(subMatch[2], 10) : null;
      const endVerse = subMatch[3] ? Number.parseInt(subMatch[3], 10) : startVerse;

      return { book, chapter, endChapter: null, startVerse, endVerse };
    });

    return subRefs.some((subRef) => subRef === null) ? null : subRefs;
  }

  let match = normalizedReference.match(/^(\d?\s?[A-Za-z\s]+?)\s+(\d+)-(\d+)$/);

  if (match) {
    return [
      {
        book: normalizeBookName(match[1]),
        type: "chapterRange",
        startChapter: Number.parseInt(match[2], 10),
        endChapter: Number.parseInt(match[3], 10)
      }
    ];
  }

  match = normalizedReference.match(/^(\d?\s?[A-Za-z\s]+?)\s+(\d+)-(\d+):(\d+)$/);

  if (match) {
    return [
      {
        book: normalizeBookName(match[1]),
        type: "chapterToVerseRange",
        startChapter: Number.parseInt(match[2], 10),
        endChapter: Number.parseInt(match[3], 10),
        endVerse: Number.parseInt(match[4], 10)
      }
    ];
  }

  match = normalizedReference.match(/^(\d?\s?[A-Za-z\s]+?)\s+(\d+)(?:-(\d+))?(?::(\d+)(?:-(\d+))?)?$/);

  if (!match) {
    return null;
  }

  return [
    {
      book: normalizeBookName(match[1]),
      chapter: Number.parseInt(match[2], 10),
      endChapter: match[3] ? Number.parseInt(match[3], 10) : null,
      startVerse: match[4] ? Number.parseInt(match[4], 10) : null,
      endVerse: match[5] ? Number.parseInt(match[5], 10) : match[4] ? Number.parseInt(match[4], 10) : null
    }
  ];
}
