import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const planSource = path.join(appRoot, "mcheyne-plan.tmp.json");
const kjvSource = path.join(appRoot, "kjv.tmp.json");
const publicData = path.join(appRoot, "public", "data");
const planTarget = path.join(publicData, "reading-plan", "mcheyne-plan.json");
const kjvTargetDir = path.join(publicData, "bible", "kjv");
const webTargetDir = path.join(publicData, "bible", "web");

const BOOKS = [
  ["Genesis", "genesis"],
  ["Exodus", "exodus"],
  ["Leviticus", "leviticus"],
  ["Numbers", "numbers"],
  ["Deuteronomy", "deuteronomy"],
  ["Joshua", "joshua"],
  ["Judges", "judges"],
  ["Ruth", "ruth"],
  ["1 Samuel", "1-samuel"],
  ["2 Samuel", "2-samuel"],
  ["1 Kings", "1-kings"],
  ["2 Kings", "2-kings"],
  ["1 Chronicles", "1-chronicles"],
  ["2 Chronicles", "2-chronicles"],
  ["Ezra", "ezra"],
  ["Nehemiah", "nehemiah"],
  ["Esther", "esther"],
  ["Job", "job"],
  ["Psalm", "psalm"],
  ["Proverbs", "proverbs"],
  ["Ecclesiastes", "ecclesiastes"],
  ["Song of Solomon", "song-of-solomon"],
  ["Isaiah", "isaiah"],
  ["Jeremiah", "jeremiah"],
  ["Lamentations", "lamentations"],
  ["Ezekiel", "ezekiel"],
  ["Daniel", "daniel"],
  ["Hosea", "hosea"],
  ["Joel", "joel"],
  ["Amos", "amos"],
  ["Obadiah", "obadiah"],
  ["Jonah", "jonah"],
  ["Micah", "micah"],
  ["Nahum", "nahum"],
  ["Habakkuk", "habakkuk"],
  ["Zephaniah", "zephaniah"],
  ["Haggai", "haggai"],
  ["Zechariah", "zechariah"],
  ["Malachi", "malachi"],
  ["Matthew", "matthew"],
  ["Mark", "mark"],
  ["Luke", "luke"],
  ["John", "john"],
  ["Acts", "acts"],
  ["Romans", "romans"],
  ["1 Corinthians", "1-corinthians"],
  ["2 Corinthians", "2-corinthians"],
  ["Galatians", "galatians"],
  ["Ephesians", "ephesians"],
  ["Philippians", "philippians"],
  ["Colossians", "colossians"],
  ["1 Thessalonians", "1-thessalonians"],
  ["2 Thessalonians", "2-thessalonians"],
  ["1 Timothy", "1-timothy"],
  ["2 Timothy", "2-timothy"],
  ["Titus", "titus"],
  ["Philemon", "philemon"],
  ["Hebrews", "hebrews"],
  ["James", "james"],
  ["1 Peter", "1-peter"],
  ["2 Peter", "2-peter"],
  ["1 John", "1-john"],
  ["2 John", "2-john"],
  ["3 John", "3-john"],
  ["Jude", "jude"],
  ["Revelation", "revelation"]
];

const WEB_SOURCE_FILENAMES = {
  "1-samuel": "1samuel",
  "2-samuel": "2samuel",
  "1-kings": "1kings",
  "2-kings": "2kings",
  "1-chronicles": "1chronicles",
  "2-chronicles": "2chronicles",
  psalm: "psalms",
  "song-of-solomon": "songofsolomon",
  "1-corinthians": "1corinthians",
  "2-corinthians": "2corinthians",
  "1-thessalonians": "1thessalonians",
  "2-thessalonians": "2thessalonians",
  "1-timothy": "1timothy",
  "2-timothy": "2timothy",
  "1-peter": "1peter",
  "2-peter": "2peter",
  "1-john": "1john",
  "2-john": "2john",
  "3-john": "3john"
};

function prettyJson(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

async function readJson(filePath) {
  const text = await readFile(filePath, "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function normalizeWebBook(records, book) {
  const chapters = [];

  for (const item of records) {
    if (!item || (item.type !== "paragraph text" && item.type !== "line text")) {
      continue;
    }

    const chapterIndex = item.chapterNumber - 1;
    const verseIndex = item.verseNumber - 1;
    chapters[chapterIndex] ??= [];
    chapters[chapterIndex][verseIndex] = [
      chapters[chapterIndex][verseIndex],
      item.value
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return { book, chapters };
}

async function preparePlan() {
  const plan = await readJson(planSource);
  if (!Array.isArray(plan) || plan.length < 365) {
    throw new Error("M'Cheyne plan must contain the full year.");
  }

  await mkdir(path.dirname(planTarget), { recursive: true });
  await writeFile(planTarget, prettyJson(plan));
}

async function prepareKjv() {
  const books = await readJson(kjvSource);
  if (!Array.isArray(books) || books.length !== BOOKS.length) {
    throw new Error(`Expected ${BOOKS.length} KJV books, found ${books.length}.`);
  }

  await rm(kjvTargetDir, { recursive: true, force: true });
  await mkdir(kjvTargetDir, { recursive: true });

  await Promise.all(
    BOOKS.map(async ([book, filename], index) => {
      const sourceBook = books[index];
      await writeFile(
        path.join(kjvTargetDir, `${filename}.json`),
        prettyJson({ book, chapters: sourceBook.chapters })
      );
    })
  );
}

async function prepareWeb() {
  await rm(webTargetDir, { recursive: true, force: true });
  await mkdir(webTargetDir, { recursive: true });

  for (const [book, filename] of BOOKS) {
    const sourceName = WEB_SOURCE_FILENAMES[filename] ?? filename;
    const url = `https://cdn.jsdelivr.net/gh/TehShrike/world-english-bible@master/json/${sourceName}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
    }

    const records = await response.json();
    const normalized = normalizeWebBook(records, book);
    await writeFile(path.join(webTargetDir, `${filename}.json`), prettyJson(normalized));
  }
}

await preparePlan();
await prepareKjv();
await prepareWeb();

console.log("Prepared local M'Cheyne plan, KJV, and WEB data.");
