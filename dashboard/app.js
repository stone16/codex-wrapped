const response = await fetch("./data.json", { cache: "no-store" });

if (!response.ok) {
  const message = `Failed to load data.json (${response.status})`;
  document.body.innerHTML = `<main class="wrap"><div class="panel">${message}</div></main>`;
  throw new Error(message);
}

const data = await response.json();

const summary = data.summary || {};
const activity = data.activity || {};
const models = data.models || [];
const config = data.config || {};
const locale = config.locale || "en-US";
const timeZone = config.timezone && config.timezone !== "local" ? config.timezone : undefined;

const numberFormatter = new Intl.NumberFormat(locale);
const shortFormatter = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const formatCompact = (value) => {
  const safe = Number(value || 0);
  return safe >= 1_000_000 ? shortFormatter.format(safe) : numberFormatter.format(safe);
};

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = data.year ?? "--";

const titleEl = document.getElementById("title");
if (titleEl) titleEl.textContent = config.title || "Codex";

const subtitleEl = document.getElementById("subtitle");
if (subtitleEl) subtitleEl.textContent = config.subtitle || "Your year in the Codex CLI";

const highlightLabelEl = document.getElementById("highlight-label");
if (highlightLabelEl) highlightLabelEl.textContent = config.highlight_label || "Signal";

const generatedAtEl = document.getElementById("generated-at");
if (generatedAtEl && data.generatedAt) {
  const generatedDate = new Date(data.generatedAt);
  generatedAtEl.textContent = generatedDate.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone });
}

const sessionsCountEl = document.getElementById("sessions-count");
if (sessionsCountEl) {
  sessionsCountEl.textContent = numberFormatter.format(summary.sessions || 0);
}

const firstRunEl = document.getElementById("first-run");
const daysSinceEl = document.getElementById("days-since");
if (summary.firstSessionDate && firstRunEl && daysSinceEl) {
  const firstDate = new Date(summary.firstSessionDate);
  firstRunEl.textContent = firstDate.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone });
  daysSinceEl.textContent = `${numberFormatter.format(summary.daysSinceFirstSession || 0)} days ago`;
}

const mostActiveDayEl = document.getElementById("most-active-day");
const mostActiveCountEl = document.getElementById("most-active-count");
const mostActiveWeekdayEl = document.getElementById("most-active-weekday");
if (mostActiveDayEl && mostActiveCountEl && mostActiveWeekdayEl) {
  if (summary.mostActiveDay) {
    const dateValue = summary.mostActiveDay.date;
    if (dateValue) {
      mostActiveDayEl.textContent = formatShortDate(dateValue, locale, timeZone);
      const weekdayDate = new Date(`${dateValue}T00:00:00`);
      mostActiveWeekdayEl.textContent = Number.isNaN(weekdayDate.getTime())
        ? "--"
        : weekdayDate.toLocaleDateString(locale, { weekday: "long", timeZone });
    } else {
      mostActiveDayEl.textContent = summary.mostActiveDay.formattedDate || "--";
      mostActiveWeekdayEl.textContent = "--";
    }
    mostActiveCountEl.textContent = `${formatCompact(summary.mostActiveDay.count || 0)} turns`;
  } else {
    mostActiveDayEl.textContent = "--";
    mostActiveWeekdayEl.textContent = "--";
    mostActiveCountEl.textContent = "No activity";
  }
}

const highlightValueEl = document.getElementById("highlight-value");
const highlightSubEl = document.getElementById("highlight-sub");
if (highlightValueEl && highlightSubEl) {
  if (models.length > 0) {
    const topModel = models[0];
    highlightValueEl.textContent = topModel.name;
    highlightSubEl.textContent = `${shortFormatter.format(topModel.tokens)} tokens | ${currencyFormatter.format(topModel.costUSD || 0)}`;
  } else {
    highlightValueEl.textContent = "No data";
    highlightSubEl.textContent = "Run the data build";
  }
}

setStat("stat-sessions", summary.sessions, numberFormatter);
setStat("stat-turns", summary.turns, formatCompact);
setStat("stat-total-tokens", summary.totalTokens, formatCompact);

const cacheReadEl = document.getElementById("cache-read");
if (cacheReadEl) {
  cacheReadEl.textContent = formatCompact(summary.cachedInputTokens || 0);
}

const cacheInputEl = document.getElementById("cache-input");
if (cacheInputEl) {
  cacheInputEl.textContent = formatCompact(summary.inputTokens || 0);
}

const cacheOutputEl = document.getElementById("cache-output");
if (cacheOutputEl) {
  cacheOutputEl.textContent = formatCompact(summary.outputTokens || 0);
}

const cacheHitEl = document.getElementById("cache-hit");
if (cacheHitEl) {
  const percent = summary.cacheHitRate ? summary.cacheHitRate * 100 : 0;
  cacheHitEl.textContent = `${percent.toFixed(1)}%`;
}

const cacheRateEl = document.getElementById("stat-cache-rate");
if (cacheRateEl) {
  const percent = summary.cacheHitRate ? summary.cacheHitRate * 100 : 0;
  cacheRateEl.textContent = `${percent.toFixed(1)}%`;
}

const costEl = document.getElementById("stat-cost");
if (costEl) {
  costEl.textContent = currencyFormatter.format(summary.costUSD || 0);
}

const streakEl = document.getElementById("stat-streak");
if (streakEl) {
  streakEl.textContent = `${summary.maxStreak || 0} days`;
}

renderHeatmap(activity, summary.maxDailyCount || 0, data.year);
renderWeekdayChart(activity.weekdayCounts || []);
renderList("top-models", models.slice(0, 3), "tokens");

function setStat(id, value, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  const safeValue = value ?? 0;
  el.textContent = formatter.format(safeValue);
}

function formatShortDate(dateStr, localeValue, timeZoneValue) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(localeValue, { month: "short", day: "numeric", timeZone: timeZoneValue });
}

function renderHeatmap(activityData, maxCount, year) {
  const heatmap = document.getElementById("heatmap");
  const monthsRow = document.getElementById("heatmap-months");
  const legend = document.getElementById("heatmap-legend");
  if (!heatmap || !monthsRow) return;

  const dailyCounts = activityData.dailyCounts || {};
  const maxStreakDays = new Set(activityData.maxStreakDays || []);
  const selectedYear = year || new Date().getFullYear();
  const weeks = generateWeeksForYear(selectedYear);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const weekIndexByDate = new Map();
  weeks.forEach((week, index) => {
    week.forEach((dateKey) => {
      if (dateKey) {
        weekIndexByDate.set(dateKey, index);
      }
    });
  });

  const monthStarts = months
    .map((_, monthIndex) => {
      const dateKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}-01`;
      return { monthIndex, start: weekIndexByDate.get(dateKey) };
    })
    .filter((entry) => entry.start != null)
    .sort((a, b) => a.start - b.start);

  const monthSpans = monthStarts.map((entry, index) => ({
    ...entry,
    span: (monthStarts[index + 1]?.start ?? weeks.length) - entry.start,
  }));

  monthsRow.innerHTML = "";
  monthsRow.style.gridTemplateColumns = `repeat(${weeks.length}, var(--heat-size))`;
  monthsRow.style.columnGap = "var(--heat-gap)";

  monthSpans.forEach((entry) => {
    const label = document.createElement("span");
    label.className = "heatmap-month";
    label.textContent = months[entry.monthIndex] || "--";
    label.style.gridColumn = `${entry.start + 1} / span ${entry.span}`;
    monthsRow.appendChild(label);
  });

  heatmap.innerHTML = "";
  weeks.forEach((week) => {
    const weekEl = document.createElement("div");
    weekEl.className = "heatmap-week";

    week.forEach((dateKey) => {
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      if (!dateKey) {
        cell.style.visibility = "hidden";
      } else {
        const count = dailyCounts[dateKey] || 0;
        const level = getIntensityLevel(count, maxCount);
        cell.classList.add(`level-${level}`);
        if (maxStreakDays.has(dateKey)) {
          cell.classList.add("streak");
        }
        cell.title = `${dateKey}: ${count} turns`;
      }
      weekEl.appendChild(cell);
    });

    heatmap.appendChild(weekEl);
  });

  if (legend) {
    legend.textContent = `Jan - Dec | ${formatCompact(maxCount)} max/day`;
  }
}

function getIntensityLevel(count, maxCount) {
  if (count === 0 || maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.1) return 1;
  if (ratio <= 0.25) return 2;
  if (ratio <= 0.4) return 3;
  if (ratio <= 0.6) return 4;
  if (ratio <= 0.8) return 5;
  return 6;
}

function generateWeeksForYear(year) {
  const weeks = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const startDay = startDate.getDay();
  const adjustedStart = new Date(startDate);
  if (startDay !== 0) {
    adjustedStart.setDate(startDate.getDate() - startDay);
  }

  let currentDate = new Date(adjustedStart);
  let currentWeek = [];

  while (currentDate <= endDate || currentWeek.length > 0) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = formatDateKey(currentDate);

    if (currentDate.getFullYear() === year) {
      currentWeek.push(dateStr);
    } else {
      currentWeek.push("");
    }

    if (dayOfWeek === 6) {
      if (currentWeek.some((d) => d !== "")) {
        weeks.push(currentWeek);
      }
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getFullYear() > year + 1) break;
  }

  if (currentWeek.length && currentWeek.some((d) => d !== "")) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderWeekdayChart(counts) {
  const chart = document.getElementById("weekday-chart");
  const labels = document.getElementById("weekday-labels");
  if (!chart || !labels) return;

  const max = Math.max(...counts, 1);
  const maxHeight = 72;
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxIndex = counts.findIndex((value) => value === max);

  chart.innerHTML = "";
  labels.innerHTML = "";

  counts.forEach((count, index) => {
    const bar = document.createElement("div");
    bar.className = "weekday-bar";
    if (index === maxIndex) bar.classList.add("highlight");
    const height = Math.max(10, Math.round((count / max) * maxHeight));
    bar.style.height = `${height}px`;
    bar.title = `${names[index]}: ${count} turns`;
    chart.appendChild(bar);

    const label = document.createElement("span");
    label.className = "weekday-label";
    if (index === maxIndex) label.classList.add("highlight");
    label.textContent = names[index];
    labels.appendChild(label);
  });
}

function renderList(containerId, items, metricKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = "<div class=\"empty-state\">No data yet.</div>";
    return;
  }

  container.innerHTML = "";
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "list-row";

    const rank = document.createElement("div");
    rank.className = "list-rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    const main = document.createElement("div");
    main.className = "list-main";
    const name = document.createElement("span");
    name.className = "list-name";
    name.textContent = item.name;
    main.appendChild(name);

    const metric = document.createElement("div");
    metric.className = "list-metric";
    const metricValue = item[metricKey] ?? item.tokens ?? 0;
    metric.textContent = shortFormatter.format(metricValue);

    row.appendChild(rank);
    row.appendChild(main);
    row.appendChild(metric);
    container.appendChild(row);
  });
}
