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

// Formatters
const numberFormatter = new Intl.NumberFormat(locale);
const shortFormatter = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });

const formatCompact = (value) => {
  const safe = Number(value || 0);
  return safe >= 1_000_000 ? shortFormatter.format(safe) : numberFormatter.format(safe);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

// Helper to set text content
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "--";
}

// ─────────────────────────────────────────────────────────────
// Header / Hero
// ─────────────────────────────────────────────────────────────
setText("year", data.year ?? "--");

const titleEl = document.getElementById("title");
if (titleEl) {
  const baseTitle = config.title || "Codex";
  titleEl.textContent = /wrapped/i.test(baseTitle) ? baseTitle : `${baseTitle} Wrapped`;
}

const subtitleEl = document.getElementById("subtitle");
if (subtitleEl) subtitleEl.textContent = config.subtitle || "Your year in the Codex CLI";

setText("generated-at", formatShortDate(data.generatedAt));
setText("sessions-count", numberFormatter.format(summary.sessions || 0));

// ─────────────────────────────────────────────────────────────
// Top Stats Row
// ─────────────────────────────────────────────────────────────
setText("first-run", formatShortDate(summary.firstSessionDate));
setText("days-since", `${summary.daysSinceFirstSession ?? 0} days ago`);

const mostActive = summary.mostActiveDay || {};
setText("most-active-day", mostActive.formattedDate || formatShortDate(mostActive.date));
if (mostActive.date) {
  const dayOfWeek = new Date(mostActive.date).toLocaleDateString(locale, { weekday: "long" });
  setText("most-active-weekday", dayOfWeek);
}
setText("most-active-count", `${formatCompact(mostActive.count || 0)} turns`);

// ─────────────────────────────────────────────────────────────
// Weekday Chart
// ─────────────────────────────────────────────────────────────
const weekdayCounts = activity.weekdayCounts || [];
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const maxWeekday = Math.max(...weekdayCounts, 1);
const peakDayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts));

const chartEl = document.getElementById("weekday-chart");
const labelsEl = document.getElementById("weekday-labels");

if (chartEl && labelsEl) {
  weekdayCounts.forEach((count, i) => {
    const height = Math.max(6, (count / maxWeekday) * 100);
    const bar = document.createElement("div");
    bar.className = "weekday-bar" + (i === peakDayIndex ? " highlight" : "");
    bar.style.height = `${height}%`;
    chartEl.appendChild(bar);

    const label = document.createElement("span");
    label.className = "weekday-label" + (i === peakDayIndex ? " highlight" : "");
    label.textContent = weekdayLabels[i];
    labelsEl.appendChild(label);
  });
}

// ─────────────────────────────────────────────────────────────
// Heatmap (GitHub-style horizontal layout, full width)
// ─────────────────────────────────────────────────────────────
const dailyCounts = activity.dailyCounts || {};
const streakDays = new Set(activity.maxStreakDays || []);
const year = data.year || new Date().getFullYear();

const startDate = new Date(year, 0, 1);
const endDate = new Date(year, 11, 31);

const heatmapEl = document.getElementById("heatmap");
const monthsEl = document.getElementById("heatmap-months");
const legendEl = document.getElementById("heatmap-legend");

if (heatmapEl) {
  const maxCount = Math.max(...Object.values(dailyCounts), 1);
  const getLevel = (count) => {
    if (!count) return 0;
    const ratio = count / maxCount;
    if (ratio > 0.8) return 5;
    if (ratio > 0.6) return 4;
    if (ratio > 0.4) return 3;
    if (ratio > 0.2) return 2;
    return 1;
  };

  // Align to Sunday start
  const current = new Date(startDate);
  current.setDate(current.getDate() - current.getDay());

  const weeks = [];
  const monthPositions = [];
  let lastMonth = -1;

  while (current <= endDate || current.getDay() !== 0) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().slice(0, 10);
      const inRange = current >= startDate && current <= endDate;
      
      if (inRange && current.getDate() === 1) {
        monthPositions.push({ month: current.getMonth(), weekIndex: weeks.length });
        lastMonth = current.getMonth();
      }
      
      week.push({
        date: dateStr,
        count: dailyCounts[dateStr] || 0,
        inRange,
        isStreak: streakDays.has(dateStr),
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (current > endDate && current.getDay() === 0) break;
  }

  // Calculate cell size to fill container width
  const containerWidth = heatmapEl.parentElement?.offsetWidth || 800;
  const cellGap = 2;
  const totalWeeks = weeks.length;
  const cellSize = Math.floor((containerWidth - (totalWeeks - 1) * cellGap) / totalWeeks);
  
  // Set CSS variables for the entire heatmap panel
  const heatmapPanel = heatmapEl.closest('.heatmap-panel');
  if (heatmapPanel) {
    heatmapPanel.style.setProperty('--cell-size', `${cellSize}px`);
    heatmapPanel.style.setProperty('--cell-gap', `${cellGap}px`);
  }

  // Render month labels with proper spacing
  if (monthsEl) {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const weekWidth = cellSize + cellGap;
    
    monthPositions.forEach((pos, i) => {
      const nextPos = monthPositions[i + 1]?.weekIndex ?? weeks.length;
      const span = nextPos - pos.weekIndex;
      const label = document.createElement("span");
      label.className = "heatmap-month";
      label.textContent = monthNames[pos.month];
      label.style.width = `${span * weekWidth}px`;
      monthsEl.appendChild(label);
    });
  }

  // Render weeks
  weeks.forEach((week) => {
    const weekEl = document.createElement("div");
    weekEl.className = "heatmap-week";
    week.forEach((day) => {
      const cell = document.createElement("div");
      if (!day.inRange) {
        cell.className = "heatmap-cell outside";
      } else {
        const level = getLevel(day.count);
        cell.className = `heatmap-cell level-${level}` + (day.isStreak ? " streak" : "");
        cell.title = `${day.date}: ${formatCompact(day.count)} turns`;
      }
      weekEl.appendChild(cell);
    });
    heatmapEl.appendChild(weekEl);
  });

  // Legend text
  if (legendEl) {
    const totalDays = Object.keys(dailyCounts).length;
    legendEl.textContent = `${totalDays} active days`;
  }
}

// ─────────────────────────────────────────────────────────────
// Top Models (show only top 3)
// ─────────────────────────────────────────────────────────────
const topModelsEl = document.getElementById("top-models");
const highlightLabelEl = document.getElementById("highlight-label");
const highlightValueEl = document.getElementById("highlight-value");
const highlightSubEl = document.getElementById("highlight-sub");

if (models.length > 0) {
  const topModel = models[0];
  if (highlightLabelEl) highlightLabelEl.textContent = "#1";
  if (highlightValueEl) highlightValueEl.textContent = topModel.name;
  if (highlightSubEl) {
    const pct = (topModel.percentage * 100).toFixed(1);
    highlightSubEl.textContent = `${pct}% of tokens · ${currencyFormatter.format(topModel.costUSD || 0)}`;
  }

  if (topModelsEl) {
    // Only show #2 and #3 (slice 1-3)
    models.slice(1, 3).forEach((model, i) => {
      const row = document.createElement("div");
      row.className = "list-row";
      row.innerHTML = `
        <span class="list-rank">#${i + 2}</span>
        <div class="list-main">
          <span class="list-name">${model.name}</span>
          <span class="list-sub">${(model.percentage * 100).toFixed(1)}% of tokens</span>
        </div>
        <span class="list-metric">${currencyFormatter.format(model.costUSD || 0)}</span>
      `;
      topModelsEl.appendChild(row);
    });

    if (models.length <= 1) {
      topModelsEl.innerHTML = '<div class="empty-state">Only one model used</div>';
    }
  }
} else {
  if (highlightValueEl) highlightValueEl.textContent = "No data";
  if (topModelsEl) topModelsEl.innerHTML = '<div class="empty-state">No model data available</div>';
}

// ─────────────────────────────────────────────────────────────
// Cache Efficiency
// ─────────────────────────────────────────────────────────────
setText("cache-read", formatCompact(summary.cachedInputTokens || 0));
setText("cache-hit", percentFormatter.format(summary.cacheHitRate || 0));
setText("cache-input", formatCompact(summary.inputTokens || 0));
setText("cache-output", formatCompact(summary.outputTokens || 0));

// ─────────────────────────────────────────────────────────────
// Totals Section
// ─────────────────────────────────────────────────────────────
setText("stat-sessions", numberFormatter.format(summary.sessions || 0));
setText("stat-turns", formatCompact(summary.turns || 0));
setText("stat-total-tokens", formatCompact(summary.totalTokens || 0));
setText("stat-cost", currencyFormatter.format(summary.costUSD || 0));
setText("stat-streak", `${summary.maxStreak || 0} days`);
setText("stat-cache-rate", percentFormatter.format(summary.cacheHitRate || 0));
