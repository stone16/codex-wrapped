import { colors, layout, spacing, typography } from "./design-tokens.js";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function h(type, props, ...children) {
  const flatChildren = children.flat().filter((child) => child !== null && child !== undefined && child !== false);
  const nextProps = { ...(props || {}) };
  if (type === "div") {
    const nextStyle = { ...(nextProps.style || {}) };
    if (!nextStyle.display) {
      nextStyle.display = "flex";
      nextStyle.flexDirection = "column";
    }
    nextProps.style = nextStyle;
  }
  return {
    type,
    props: {
      ...nextProps,
      children: flatChildren,
    },
  };
}

function formatShortDate(dateStr, locale, timeZone) {
  if (!dateStr) return "--";
  // Handle both YYYY-MM-DD and ISO date strings
  const date = dateStr.includes("T") ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone });
}

function formatDateLabel(dateValue, locale, timeZone) {
  if (!dateValue) return "--";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone });
}

function getIntensityLevel(count, maxCount) {
  if (count === 0 || maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
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
    const inRange = currentDate >= startDate && currentDate <= endDate;

    currentWeek.push({ dateStr: inRange ? dateStr : "", inRange });

    if (dayOfWeek === 6) {
      if (currentWeek.some((d) => d.inRange)) {
        weeks.push(currentWeek);
      }
      currentWeek = [];
    }

    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getFullYear() > year + 1) break;
  }

  if (currentWeek.length && currentWeek.some((d) => d.inRange)) {
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

function labelText(text) {
  return h(
    "span",
    {
      style: {
        textTransform: "uppercase",
        fontSize: 9,
        letterSpacing: 1.4,
        color: colors.text.muted,
        fontWeight: typography.weight.medium,
      },
    },
    text
  );
}

function statCard(children, extraStyle = {}) {
  return h(
    "div",
    {
      style: {
        flex: 1,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: layout.radius.lg,
        padding: 12,
        boxShadow: layout.shadow,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: 110,
        ...extraStyle,
      },
    },
    children
  );
}

function panel(children, extraStyle = {}) {
  return h(
    "div",
    {
      style: {
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: layout.radius.lg,
        padding: 12,
        boxShadow: layout.shadow,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        ...extraStyle,
      },
    },
    children
  );
}

function panelHeader(title, tag) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 0,
        gap: 12,
      },
    },
    h(
      "span",
      {
        style: {
          fontSize: 16,
          fontWeight: typography.weight.bold,
          letterSpacing: 0.6,
        },
      },
      title
    ),
    tag
      ? h(
          "span",
          {
            style: {
              fontSize: 9,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              color: colors.text.muted,
            },
          },
          tag
        )
      : null
  );
}

function renderWeekdayChart(counts) {
  const safeCounts = Array.isArray(counts) && counts.length === 7 ? counts : new Array(7).fill(0);
  const max = Math.max(...safeCounts, 1);
  const maxIndex = safeCounts.findIndex((value) => value === max);

  const bars = safeCounts.map((count, index) => {
    const height = Math.max(6, Math.round((count / max) * 64));
    const isHighlight = index === maxIndex;
    return h("div", {
      style: {
        flex: 1,
        height,
        borderRadius: 4,
        backgroundImage: isHighlight
          ? "linear-gradient(180deg, rgba(241, 179, 117, 0.85), rgba(255, 255, 255, 0.7))"
          : "linear-gradient(180deg, rgba(16, 163, 127, 0.65), rgba(255, 255, 255, 0.6))",
        border: `1px solid ${isHighlight ? "rgba(241, 179, 117, 0.5)" : "rgba(16, 163, 127, 0.3)"}`,
      },
    });
  });

  const labels = WEEKDAY_LABELS.map((label, index) => {
    const isHighlight = index === maxIndex;
    return h(
      "div",
      {
        style: {
          flex: 1,
          fontSize: 9,
          color: isHighlight ? colors.text.primary : colors.text.muted,
          fontWeight: isHighlight ? typography.weight.bold : typography.weight.regular,
          textAlign: "center",
          borderBottom: isHighlight ? `2px solid ${colors.accent.warm}` : "2px solid transparent",
          paddingBottom: 2,
        },
      },
      label
    );
  });

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 4 } },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 4,
          height: 64,
          padding: "2px 2px 0",
        },
      },
      bars
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          gap: 0,
          marginTop: 4,
        },
      },
      labels
    )
  );
}

function renderHeatmap(activity, maxDailyCount, year) {
  const dailyCounts = activity.dailyCounts || {};
  const streakDays = new Set(activity.maxStreakDays || []);
  const selectedYear = year || new Date().getFullYear();
  const weeks = generateWeeksForYear(selectedYear);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const CELL_SIZE = 13;
  const CELL_GAP = 2;

  // Calculate month positions
  const weekIndexByDate = new Map();
  weeks.forEach((week, index) => {
    week.forEach((day) => {
      if (day.dateStr) weekIndexByDate.set(day.dateStr, index);
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

  const monthLabels = monthSpans.map((entry) => {
    const width = entry.span * CELL_SIZE + Math.max(entry.span - 1, 0) * CELL_GAP;
    return h(
      "div",
      {
        style: {
          width,
          fontSize: 8,
          color: colors.text.muted,
          textAlign: "left",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          flexShrink: 0,
        },
      },
      months[entry.monthIndex] || "--"
    );
  });

  const weekdayLabels = ["", "Mon", "", "Wed", "", "Fri", ""].map((label) =>
    h(
      "span",
      {
        style: {
          height: CELL_SIZE,
          display: "flex",
          alignItems: "center",
          fontSize: 8,
          color: colors.text.faint,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      },
      label
    )
  );

  const heatmapColumns = weeks.map((week) => {
    const cells = week.map((day) => {
      if (!day.inRange || !day.dateStr) {
        return h("div", { style: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: "transparent" } });
      }
      const count = dailyCounts[day.dateStr] || 0;
      const level = getIntensityLevel(count, maxDailyCount);
      const isStreak = streakDays.has(day.dateStr);
      return h("div", {
        style: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: 2,
          backgroundColor: colors.heatmap[Math.min(level, colors.heatmap.length - 1)],
          boxShadow: isStreak ? `inset 0 0 0 2px ${colors.accent.strong}` : "none",
        },
      });
    });

    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: CELL_GAP } },
      cells
    );
  });

  const heatmapFoot = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        fontSize: 9,
        color: colors.text.muted,
        paddingTop: 2,
      },
    },
    h("span", null, "Less"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: 3 } },
      colors.heatmap.slice(0, 6).map((color) =>
        h("div", { style: { width: 10, height: 10, borderRadius: 2, backgroundColor: color } })
      )
    ),
    h("span", null, "More")
  );

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 4 } },
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: 8, width: "100%" } },
      // Weekday labels column
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: CELL_GAP,
            paddingTop: 14,
            width: 24,
            flexShrink: 0,
          },
        },
        weekdayLabels
      ),
      // Heatmap content
      h(
        "div",
        { style: { flex: 1, display: "flex", flexDirection: "column", gap: 2 } },
        h(
          "div",
          { style: { display: "flex", flexDirection: "row", gap: CELL_GAP, paddingLeft: 1, height: 14 } },
          monthLabels
        ),
        h(
          "div",
          { style: { display: "flex", flexDirection: "row", gap: CELL_GAP } },
          heatmapColumns
        )
      )
    ),
    heatmapFoot
  );
}

function renderHighlight(model, currencyFormatter) {
  // HTML uses inline spans, so we use flex row with wrap
  return h(
    "div",
    {
      style: {
        backgroundImage: "linear-gradient(145deg, rgba(16, 163, 127, 0.12), rgba(255, 255, 255, 0.8))",
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        border: "1px solid rgba(16, 163, 127, 0.2)",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: 8,
      },
    },
    h(
      "span",
      {
        style: {
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: 1.4,
          color: colors.text.muted,
          fontWeight: typography.weight.medium,
        },
      },
      "#1"
    ),
    h(
      "span",
      { style: { fontSize: 18, fontWeight: typography.weight.bold } },
      model ? model.name : "No data"
    ),
    h(
      "span",
      { style: { fontSize: 11, color: colors.text.muted } },
      model
        ? `${((model.percentage || 0) * 100).toFixed(1)}% of tokens · ${currencyFormatter.format(model.costUSD || 0)}`
        : "Run the data build"
    )
  );
}

function renderModelList(items, currencyFormatter) {
  if (!items.length) {
    return h(
      "div",
      {
        style: {
          backgroundColor: colors.surfaceStrong,
          borderRadius: 12,
          border: "1px solid rgba(48, 36, 24, 0.06)",
          padding: 12,
          fontSize: 12,
          color: colors.text.faint,
        },
      },
      "No data yet."
    );
  }

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 8 } },
    items.map((item, index) =>
      h(
        "div",
        {
          style: {
            backgroundColor: colors.surfaceStrong,
            borderRadius: 10,
            border: "1px solid rgba(48, 36, 24, 0.06)",
            padding: 8,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          },
        },
        h(
          "div",
          { style: { width: 28, textAlign: "right", fontWeight: typography.weight.bold, color: colors.accent.primary } },
          `#${index + 2}`
        ),
        h(
          "div",
          { style: { flex: 1, display: "flex", flexDirection: "column", gap: 0 } },
          h("span", { style: { fontSize: 12 } }, item.name),
          h("span", { style: { fontSize: 9, color: colors.text.faint } }, `${((item.percentage || 0) * 100).toFixed(1)}% of tokens`)
        ),
        h(
          "div",
          { style: { fontSize: 11, color: colors.text.muted, textAlign: "right" } },
          currencyFormatter.format(item.costUSD || 0)
        )
      )
    )
  );
}

export function buildWrappedTemplate(data) {
  const summary = data.summary || {};
  const activity = data.activity || {};
  const models = Array.isArray(data.models) ? data.models : [];
  const config = data.config || {};
  const locale = config.locale || "en-US";
  const timeZone = config.timezone && config.timezone !== "local" ? config.timezone : undefined;

  const numberFormatter = new Intl.NumberFormat(locale);
  const shortFormatter = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const currencyFormatter = new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const percentFormatter = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 });

  const formatCompact = (value) => {
    const safe = Number(value || 0);
    if (safe >= 1_000_000) return shortFormatter.format(safe);
    return numberFormatter.format(safe);
  };

  const year = data.year ?? new Date().getFullYear();
  const generatedAt = formatDateLabel(data.generatedAt, locale, timeZone);
  const sessionsCount = numberFormatter.format(summary.sessions || 0);

  const mostActiveDay = summary.mostActiveDay;
  const mostActiveDate = mostActiveDay?.date
    ? formatShortDate(mostActiveDay.date, locale, timeZone)
    : mostActiveDay?.formattedDate || "--";
  const mostActiveWeekday = mostActiveDay?.date
    ? new Date(`${mostActiveDay.date}T00:00:00`).toLocaleDateString(locale, { weekday: "long", timeZone })
    : "--";

  const highlightModel = models[0];
  const topModels = models.slice(1, 3); // #2 and #3

  // Title with "Wrapped" suffix
  const baseTitle = config.title || "Codex";
  const displayTitle = /wrapped/i.test(baseTitle) ? baseTitle : `${baseTitle} Wrapped`;

  // Header
  const header = h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      },
    },
    // Brand
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: 10, alignItems: "center" } },
      h(
        "div",
        {
          style: {
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.accent.primary,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: typography.weight.bold,
            boxShadow: "0 8px 16px rgba(16, 163, 127, 0.22)",
          },
        },
        "C"
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        h(
          "span",
          { style: { fontSize: 28, fontWeight: typography.weight.bold, letterSpacing: 0.6 } },
          displayTitle
        ),
        h(
          "span",
          { style: { fontSize: 11, color: colors.text.muted } },
          config.subtitle || "Your year in the Codex CLI"
        )
      )
    ),
    // Wrapped year
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0 } },
      h(
        "span",
        {
          style: {
            textTransform: "uppercase",
            fontSize: 9,
            letterSpacing: 1.6,
            color: colors.text.faint,
          },
        },
        "wrapped"
      ),
      h(
        "span",
        { style: { fontSize: 42, fontWeight: typography.weight.bold, color: colors.accent.strong, letterSpacing: 1 } },
        String(year)
      )
    )
  );

  // Meta pill
  const metaPill = h(
    "div",
    { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 } },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 8,
          paddingRight: 8,
          borderRadius: 999,
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          border: `1px solid ${colors.border}`,
          fontSize: 9,
          color: colors.text.muted,
          fontWeight: typography.weight.medium,
        },
      },
      h("span", { style: { color: colors.text.faint, textTransform: "uppercase", letterSpacing: 1 } }, "Generated"),
      h("span", { style: { color: colors.text.primary, fontWeight: 600 } }, generatedAt),
      h("span", { style: { color: colors.text.faint, opacity: 0.6 } }, "•"),
      h("span", { style: { color: colors.text.faint, textTransform: "uppercase", letterSpacing: 1 } }, "Sessions"),
      h("span", { style: { color: colors.text.primary, fontWeight: 600 } }, sessionsCount)
    )
  );

  // Top stats row
  const topStats = h(
    "div",
    { style: { display: "flex", flexDirection: "row", gap: 8 } },
    statCard([
      labelText("Started"),
      h("span", { style: { fontSize: 11, color: colors.text.muted } }, formatShortDate(summary.firstSessionDate, locale, timeZone)),
      h("span", { style: { fontSize: 24, fontWeight: typography.weight.bold, lineHeight: 1.2 } }, `${numberFormatter.format(summary.daysSinceFirstSession || 0)} days ago`),
    ]),
    statCard([
      labelText("Most Active Day"),
      h("span", { style: { fontSize: 11, color: colors.text.muted } }, mostActiveWeekday),
      h("span", { style: { fontSize: 24, fontWeight: typography.weight.bold, lineHeight: 1.2 } }, mostActiveDate),
      h("span", { style: { fontSize: 11, color: colors.text.muted } }, `${formatCompact(mostActiveDay?.count || 0)} turns`),
    ]),
    statCard([
      labelText("Weekly Activity"),
      renderWeekdayChart(activity.weekdayCounts || []),
    ])
  );

  // Heatmap panel
  const activeDays = Object.keys(activity.dailyCounts || {}).length;
  const heatmapPanel = panel([
    panelHeader("Activity", `${activeDays} active days`),
    renderHeatmap(activity, summary.maxDailyCount || 0, year),
  ], { padding: "12px 14px" });

  // Top Models panel
  const topModelsPanel = panel([
    panelHeader("Top Models", "By total tokens"),
    renderHighlight(highlightModel, currencyFormatter),
    renderModelList(topModels, currencyFormatter),
  ], { flex: 1 });

  // Cache Efficiency panel
  const cachePanel = panel([
    panelHeader("Cache Efficiency", "Prompt caching impact"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 } },
      [
        { label: "Cache Read", value: formatCompact(summary.cachedInputTokens || 0) },
        { label: "Cache Hit", value: percentFormatter.format(summary.cacheHitRate || 0) },
        { label: "Input Tokens", value: formatCompact(summary.inputTokens || 0) },
        { label: "Output Tokens", value: formatCompact(summary.outputTokens || 0) },
      ].map((metric) =>
        h(
          "div",
          {
            style: {
              backgroundColor: colors.surfaceStrong,
              borderRadius: 12,
              border: "1px solid rgba(48, 36, 24, 0.06)",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              flex: 1,
              minWidth: 140,
            },
          },
          h("span", { style: { fontSize: 9, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 1.4 } }, metric.label),
          h("span", { style: { fontSize: 14, fontWeight: typography.weight.bold } }, metric.value)
        )
      )
    ),
  ], { flex: 1 });

  // Totals panel - 3 columns grid like HTML
  const totalsStats = [
    { label: "Sessions", value: numberFormatter.format(summary.sessions || 0) },
    { label: "Turns", value: formatCompact(summary.turns || 0) },
    { label: "Total Tokens", value: formatCompact(summary.totalTokens || 0) },
    { label: "Cost", value: currencyFormatter.format(summary.costUSD || 0) },
    { label: "Max Streak", value: `${summary.maxStreak || 0} days` },
    { label: "Cache Hit Rate", value: percentFormatter.format(summary.cacheHitRate || 0) },
  ];

  const statBox = (stat) =>
    h(
      "div",
      {
        style: {
          backgroundColor: colors.surfaceStrong,
          borderRadius: 14,
          border: "1px solid rgba(48, 36, 24, 0.06)",
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flex: 1,
        },
      },
      h("span", { style: { fontSize: 9, color: colors.text.muted, textTransform: "uppercase", letterSpacing: 1.4 } }, stat.label),
      h("span", { style: { fontSize: 18, fontWeight: typography.weight.bold } }, stat.value)
    );

  const totalsPanel = panel([
    panelHeader("Totals", "Year-wide snapshot"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      // First row: Sessions, Turns, Total Tokens
      h(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: 8 } },
        totalsStats.slice(0, 3).map(statBox)
      ),
      // Second row: Cost, Max Streak, Cache Hit Rate
      h(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: 8 } },
        totalsStats.slice(3, 6).map(statBox)
      )
    ),
  ], { padding: 12 });

  // Footer with bottom padding
  const footer = h(
    "div",
    { 
      style: { 
        textAlign: "center", 
        fontSize: 9, 
        color: colors.text.faint, 
        marginTop: 2,
        paddingBottom: layout.padding.bottom,
      } 
    },
    "@stometaverse"
  );

  // Card-only output (no outer canvas wrapper)
  return h(
    "div",
    {
      style: {
        width: layout.canvas.width,
        height: layout.canvas.height,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        paddingLeft: layout.padding.horizontal,
        paddingRight: layout.padding.horizontal,
        paddingTop: layout.padding.top,
        fontFamily: typography.fontFamily,
        color: colors.text.primary,
        backgroundImage:
          `radial-gradient(circle at 15% 10%, rgba(16, 163, 127, 0.18), transparent 52%), ` +
          `radial-gradient(circle at 85% 15%, rgba(241, 179, 117, 0.24), transparent 55%), ` +
          `radial-gradient(circle at 70% 85%, rgba(229, 139, 122, 0.2), transparent 60%), ` +
          `linear-gradient(160deg, ${colors.background}, ${colors.backgroundAlt})`,
        borderRadius: layout.radius.card,
      },
    },
    header,
    metaPill,
    topStats,
    heatmapPanel,
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: 8 } },
      topModelsPanel,
      cachePanel
    ),
    totalsPanel,
    footer
  );
}
