import { useEffect, useRef, useState } from "react";
import { getPassage } from "./lib/bible";
import { publicPath } from "./lib/paths";
import { loadBibleVersion, loadProgress, markReadingComplete, saveBibleVersion } from "./lib/progress";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const TABS = ["Family 1", "Family 2", "Secret 1", "Secret 2", "All"];
const TAB_INDEX = {
  "Family 1": 0,
  "Family 2": 1,
  "Secret 1": 2,
  "Secret 2": 3
};

const NEXT_TAB_BY_READING_LABEL = {
  "Family Reading 1": "Family 2",
  "Family Reading 2": "Secret 1",
  "Secret Reading 1": "Secret 2"
};

function getTodayMonthDay() {
  const today = new Date();
  return {
    month: today.getMonth() + 1,
    day: today.getDate()
  };
}

function getDaysInSelectedMonth(month) {
  return {
    1: 31,
    2: 29,
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31
  }[month] ?? 31;
}

function getReadingsForActiveTab(readings, activeTab) {
  if (!readings?.length || activeTab === "All") {
    return readings ?? [];
  }

  const index = TAB_INDEX[activeTab];
  return index === undefined || !readings[index] ? readings : [readings[index]];
}

function createBibleGatewayNKJVLink(reference) {
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(reference)}&version=NKJV`;
}

function getNextTabForReadingLabel(label) {
  return NEXT_TAB_BY_READING_LABEL[label] ?? null;
}

export default function App() {
  const today = getTodayMonthDay();
  const [selectedMonth, setSelectedMonth] = useState(today.month);
  const [selectedDay, setSelectedDay] = useState(today.day);
  const [bibleVersion, setBibleVersion] = useState(loadBibleVersion);
  const [passageTexts, setPassageTexts] = useState({});
  const [passageErrors, setPassageErrors] = useState({});
  const [readingPlan, setReadingPlan] = useState([]);
  const [isPlanLoading, setIsPlanLoading] = useState(true);
  const [planLoadError, setPlanLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState("Family 1");
  const [progress, setProgress] = useState(() => loadProgress(today.month, today.day));
  const readingTopRef = useRef(null);

  function scrollToReadingTop() {
    if (readingTopRef.current) {
      readingTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPlan() {
      setIsPlanLoading(true);
      setPlanLoadError(null);

      try {
        const response = await fetch(publicPath("/data/reading-plan/mcheyne-plan.json"));

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Reading plan data is empty or invalid.");
        }

        if (isCurrent) {
          setReadingPlan(data);
        }
      } catch (error) {
        console.warn("Failed to load M'Cheyne reading plan", error);

        if (isCurrent) {
          setPlanLoadError(error);
        }
      } finally {
        if (isCurrent) {
          setIsPlanLoading(false);
        }
      }
    }

    loadPlan();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    setActiveTab("Family 1");
    setProgress(loadProgress(selectedMonth, selectedDay));
  }, [selectedMonth, selectedDay]);

  useEffect(() => {
    const selectedReading = readingPlan.find((entry) => entry.month === selectedMonth && entry.day === selectedDay);

    setPassageTexts({});
    setPassageErrors({});

    if (!selectedReading) {
      return;
    }

    let isCurrent = true;

    selectedReading.readings.forEach(async (reading, index) => {
      try {
        const passage = await getPassage(bibleVersion, reading.reference);

        if (isCurrent) {
          setPassageTexts((previous) => ({ ...previous, [index]: passage }));
          setPassageErrors((previous) => ({ ...previous, [index]: null }));
        }
      } catch (error) {
        console.warn(`Failed to load passage for ${reading.reference}`, error);

        if (isCurrent) {
          setPassageErrors((previous) => ({
            ...previous,
            [index]: `${bibleVersion.toUpperCase()} passage text could not be loaded for this reading.`
          }));
          setPassageTexts((previous) => ({ ...previous, [index]: [] }));
        }
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [selectedMonth, selectedDay, readingPlan, bibleVersion]);

  const selectedReading = readingPlan.find((entry) => entry.month === selectedMonth && entry.day === selectedDay);
  const isFeb29 = selectedMonth === 2 && selectedDay === 29;
  const dateDisplay = selectedReading
    ? selectedReading.displayDate
    : `${MONTHS[selectedMonth - 1]} ${selectedDay}`;
  const maxDays = getDaysInSelectedMonth(selectedMonth);
  const showTabs = selectedReading && !isFeb29;
  const readingsToDisplay = selectedReading ? getReadingsForActiveTab(selectedReading.readings, activeTab) : [];
  const completedCount = selectedReading
    ? selectedReading.readings.filter((reading) => progress[reading.label]).length
    : 0;
  const allComplete = selectedReading && completedCount === 4;

  function moveToDate(month, day) {
    setSelectedMonth(month);
    setSelectedDay(day);
    setActiveTab("Family 1");
    setProgress(loadProgress(month, day));
    setTimeout(() => scrollToReadingTop(), 0);
  }

  function handleToday() {
    const currentDay = getTodayMonthDay();
    moveToDate(currentDay.month, currentDay.day);
  }

  function handleMonthChange(event) {
    const newMonth = Number(event.target.value);
    const newDay = Math.min(selectedDay, getDaysInSelectedMonth(newMonth));
    moveToDate(newMonth, newDay);
  }

  function handleDayChange(event) {
    moveToDate(selectedMonth, Number(event.target.value));
  }

  function handleBibleVersionChange(event) {
    const nextVersion = event.target.value;
    setBibleVersion(nextVersion);
    saveBibleVersion(nextVersion);
  }

  function handleComplete(label) {
    if (isFeb29) {
      return;
    }

    const newProgress = markReadingComplete(selectedMonth, selectedDay, label);
    setProgress({ ...newProgress });

    if (label === "Family Reading 1") {
      setActiveTab("Family 2");
    } else if (label === "Family Reading 2") {
      setActiveTab("Secret 1");
    } else if (label === "Secret Reading 1") {
      setActiveTab("Secret 2");
    }

    setTimeout(() => scrollToReadingTop(), 0);
  }

  function handleCompletedReadingNext(label) {
    const nextTab = getNextTabForReadingLabel(label);
    setActiveTab(nextTab ?? "All");
    setTimeout(() => scrollToReadingTop(), 0);
  }

  function goToPreviousDay() {
    let newMonth = selectedMonth;
    let newDay = selectedDay - 1;

    if (newDay < 1) {
      newMonth = selectedMonth - 1 || 12;
      newDay = getDaysInSelectedMonth(newMonth);
    }

    moveToDate(newMonth, newDay);
  }

  function goToNextDay() {
    let newMonth = selectedMonth;
    let newDay = selectedDay + 1;

    if (newDay > getDaysInSelectedMonth(selectedMonth)) {
      newMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      newDay = 1;
    }

    moveToDate(newMonth, newDay);
  }

  return (
    <div className="app-shell">
      <header className="tdam-app-header">
        <div className="tdam-app-header-inner">
          <a href="https://thediarmanimethod.com/" target="_blank" rel="noopener noreferrer" className="tdam-app-header-logo-link">
            <img
              src="https://assets.cdn.filesafe.space/vMVl7WGukcfSGngLflNN/media/68fe9dd0e225d2f4ab64e4ee.png"
              alt="The Di Armani Method"
              className="tdam-app-header-logo"
            />
          </a>
          <div className="tdam-app-header-title-block">
            <h1 className="tdam-app-header-title">Today in M'Cheyne</h1>
            <p className="tdam-app-header-subtitle">Daily Bible Reading Plan</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-column">
          <div className="date-controls-wrapper">
            <div className="date-select-row">
              <div className="date-select-field">
                <label htmlFor="month-select">Month</label>
                <select id="month-select" value={selectedMonth} onChange={handleMonthChange}>
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="date-select-field">
                <label htmlFor="day-select">Day</label>
                <select id="day-select" value={selectedDay} onChange={handleDayChange}>
                  {Array.from({ length: maxDays }, (_, index) => index + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="date-select-field">
                <label htmlFor="version-select">Bible</label>
                <select id="version-select" value={bibleVersion} onChange={handleBibleVersionChange}>
                  <option value="kjv">KJV</option>
                  <option value="web">WEB</option>
                </select>
              </div>
            </div>

            <div className="date-nav-row">
              <button onClick={goToPreviousDay} className="date-nav-button date-nav-button-secondary">
                Previous Day
              </button>
              <button onClick={handleToday} className="date-nav-button date-nav-button-primary">
                Today
              </button>
              <button onClick={goToNextDay} className="date-nav-button date-nav-button-secondary">
                Next Day
              </button>
            </div>
          </div>

          <h2 className="date-heading">{dateDisplay}</h2>

          {isPlanLoading && <p className="status-text">Loading M'Cheyne reading plan...</p>}

          {planLoadError && (
            <div className="alert-card">
              <p>The full M'Cheyne reading plan could not be loaded.</p>
            </div>
          )}

          {!isPlanLoading && isFeb29 ? (
            <div className="reading-card">
              <p className="catch-up-copy">
                February 29 is not part of the standard M'Cheyne reading plan. Use today as a catch-up day, or choose February 28 or March 1.
              </p>
              <div className="catch-up-actions">
                <button onClick={() => moveToDate(2, 28)} className="action-button">
                  Read February 28
                </button>
                <button onClick={() => moveToDate(3, 1)} className="action-button">
                  Read March 1
                </button>
              </div>
            </div>
          ) : !isPlanLoading && showTabs ? (
            <>
              <div className="progress-text">Today's progress: {completedCount} of 4 complete</div>

              {allComplete && (
                <div className="completion-message">
                  Today's readings are complete. Return tomorrow for the next step in the plan.
                </div>
              )}

              <div ref={readingTopRef} />

              <div className="tab-row" role="tablist" aria-label="Reading tabs">
                {TABS.map((tab) => {
                  const reading = selectedReading.readings[TAB_INDEX[tab]];
                  const isCompleted = reading && progress[reading.label];
                  const displayLabel = tab === "All" ? tab : isCompleted ? `${tab} ✓` : tab;

                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab}
                      onClick={() => setActiveTab(tab)}
                      className={activeTab === tab ? "tab-button tab-button-active" : "tab-button"}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>

              <div className="readings-grid" role="tabpanel">
                {readingsToDisplay.map((reading) => {
                  const originalIndex = selectedReading.readings.indexOf(reading);
                  const passage = passageTexts[originalIndex] || [];
                  const error = passageErrors[originalIndex];
                  const isCompleted = progress[reading.label];
                  const nextTab = getNextTabForReadingLabel(reading.label);
                  const completedActionLabel = nextTab ? "Next Reading" : "View All";

                  return (
                    <article key={reading.label} className="reading-card">
                      <div className="reading-card-header">
                        <div>
                          <p className="reading-section">{reading.section}</p>
                          <p className="reading-label">{reading.label}</p>
                          <p className="reading-reference">{reading.reference}</p>
                        </div>
                        <a
                          href={createBibleGatewayNKJVLink(reading.reference)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="external-link-button"
                        >
                          Open NKJV
                        </a>
                      </div>

                      <div className="passage-box">
                        {error ? (
                          <p className="muted-text">{error}</p>
                        ) : passage.length > 0 ? (
                          passage.map((verse, index) => (
                            <p key={`${verse.verse}-${index}`} className="verse-line">
                              {verse.verse}. {verse.text}
                            </p>
                          ))
                        ) : (
                          <p className="muted-text">Loading {bibleVersion.toUpperCase()} passage text...</p>
                        )}
                      </div>

                      {!isCompleted && !isFeb29 && (
                        <div className="completion-actions">
                          <button
                            onClick={() => handleComplete(reading.label)}
                            className="complete-button"
                          >
                            {reading.label === "Secret Reading 2" ? "Complete Today's Readings" : "Mark Complete & Continue"}
                          </button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="completed-actions">
                          <div className="completed-text">{"\u2713"} Completed</div>
                          {(nextTab || activeTab !== "All") && (
                            <button
                              type="button"
                              onClick={() => handleCompletedReadingNext(reading.label)}
                              className="completed-next-button"
                            >
                              {completedActionLabel}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          ) : !isPlanLoading && !selectedReading ? (
            <p className="status-text">No reading has been added for this date yet.</p>
          ) : null}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          <a href="https://TheDiArmaniMethod.com" target="_blank" rel="noopener noreferrer">
            Learn More About The Di Armani Method for Christian Non-Fiction Writers
          </a>
        </p>
      </footer>
    </div>
  );
}
