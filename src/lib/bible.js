import { getBookFilename } from "../data/books";
import { publicPath } from "./paths";
import { parsePassageReference } from "./references";

const bookCache = new Map();

async function loadBook(version, bookName) {
  const filename = getBookFilename(bookName);

  if (!filename) {
    throw new Error(`Unknown Bible book: ${bookName}`);
  }

  const key = `${version}:${filename}`;

  if (bookCache.has(key)) {
    return bookCache.get(key);
  }

  const response = await fetch(publicPath(`/data/bible/${version}/${filename}.json`));

  if (!response.ok) {
    throw new Error(`Could not load ${version.toUpperCase()} ${bookName}: ${response.status}`);
  }

  const data = await response.json();
  bookCache.set(key, data);
  return data;
}

function readVerse(bookData, chapter, verse) {
  return bookData.chapters?.[chapter - 1]?.[verse - 1] ?? null;
}

function collectChapter(bookData, chapter, showChapter) {
  const verses = bookData.chapters?.[chapter - 1] ?? [];

  return verses
    .map((text, index) => ({
      verse: showChapter ? `${chapter}:${index + 1}` : index + 1,
      text
    }))
    .filter((verse) => verse.text);
}

function collectVerseRange(bookData, chapter, startVerse, endVerse, showChapter) {
  const verses = [];

  for (let verse = startVerse; verse <= endVerse; verse += 1) {
    const text = readVerse(bookData, chapter, verse);

    if (text) {
      verses.push({
        verse: showChapter ? `${chapter}:${verse}` : verse,
        text
      });
    }
  }

  return verses;
}

function collectParsedPassage(bookData, parsed, showChapter) {
  if (parsed.type === "chapterRange") {
    const verses = [];

    for (let chapter = parsed.startChapter; chapter <= parsed.endChapter; chapter += 1) {
      verses.push(...collectChapter(bookData, chapter, true));
    }

    return verses;
  }

  if (parsed.type === "chapterToVerseRange") {
    const verses = [];

    for (let chapter = parsed.startChapter; chapter <= parsed.endChapter; chapter += 1) {
      const lastVerse = chapter === parsed.endChapter
        ? parsed.endVerse
        : bookData.chapters?.[chapter - 1]?.length ?? 0;

      verses.push(...collectVerseRange(bookData, chapter, 1, lastVerse, true));
    }

    return verses;
  }

  if (parsed.endChapter !== null) {
    const verses = [];

    for (let chapter = parsed.chapter; chapter <= parsed.endChapter; chapter += 1) {
      verses.push(...collectChapter(bookData, chapter, true));
    }

    return verses;
  }

  if (parsed.startVerse !== null && parsed.endVerse !== null) {
    return collectVerseRange(bookData, parsed.chapter, parsed.startVerse, parsed.endVerse, showChapter);
  }

  return collectChapter(bookData, parsed.chapter, showChapter);
}

export async function getPassage(version, reference) {
  const parsedArray = parsePassageReference(reference);

  if (!parsedArray || parsedArray.length === 0) {
    return [];
  }

  const bookData = await loadBook(version, parsedArray[0].book);
  const showChapter = parsedArray.length > 1 || parsedArray.some((parsed) => parsed.endChapter !== null);

  return parsedArray.flatMap((parsed) => collectParsedPassage(bookData, parsed, showChapter));
}
