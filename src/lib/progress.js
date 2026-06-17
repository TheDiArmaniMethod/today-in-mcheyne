const DEFAULT_PROGRESS = {
  "Family Reading 1": false,
  "Family Reading 2": false,
  "Secret Reading 1": false,
  "Secret Reading 2": false
};

export function getProgressKey(month, day) {
  const year = new Date().getFullYear();
  return `mcheyne-progress-${year}-${month}-${day}`;
}

export function loadProgress(month, day) {
  try {
    const stored = window.localStorage.getItem(getProgressKey(month, day));

    if (stored) {
      return { ...DEFAULT_PROGRESS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn("Failed to load progress", error);
  }

  return { ...DEFAULT_PROGRESS };
}

export function saveProgress(month, day, progress) {
  try {
    window.localStorage.setItem(getProgressKey(month, day), JSON.stringify(progress));
  } catch (error) {
    console.warn("Failed to save progress", error);
  }
}

export function markReadingComplete(month, day, label) {
  const progress = loadProgress(month, day);
  const updatedProgress = { ...progress, [label]: true };
  saveProgress(month, day, updatedProgress);
  return updatedProgress;
}

export function loadBibleVersion() {
  try {
    const version = window.localStorage.getItem("mcheyne-bible-version");
    return version === "web" || version === "kjv" ? version : "kjv";
  } catch {
    return "kjv";
  }
}

export function saveBibleVersion(version) {
  try {
    window.localStorage.setItem("mcheyne-bible-version", version);
  } catch (error) {
    console.warn("Failed to save Bible version", error);
  }
}
