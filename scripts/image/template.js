import { colors, layout, spacing, typography } from "./design-tokens.js";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEAT_CELL = 10;
const HEAT_GAP = 3;
const WEEKDAY_BAR_HEIGHT = 56;

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
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone });
}

function formatDateLabel(dateValue, locale, timeZone) {
  if (!dateValue) return "--";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone });
}

function formatLongDate(dateValue, locale, timeZone) {
  if (!dateValue) return "--";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone });
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

function sectionHeader(title, tag) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: spacing[2],
      },
    },
    h(
      "span",
      {
        style: {
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
        },
      },
      title
    ),
    tag
      ? h(
          "span",
          {
            style: {
              fontSize: typography.size.xs,
              color: colors.text.muted,
              textTransform: "uppercase",
              letterSpacing: 1.4,
            },
          },
          tag
        )
      : null
  );
}

function statCard(children) {
  return h(
    "div",
    {
      style: {
        flex: 1,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: layout.radius.lg,
        padding: spacing[3],
        boxShadow: layout.shadow,
        display: "flex",
        flexDirection: "column",
        gap: spacing[1],
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
        padding: spacing[3],
        boxShadow: layout.shadow,
        display: "flex",
        flexDirection: "column",
        gap: spacing[2],
        ...extraStyle,
      },
    },
    children
  );
}

function labelText(text) {
  return h(
    "span",
    {
      style: {
        textTransform: "uppercase",
        fontSize: typography.size.xs,
        letterSpacing: 1.4,
        color: colors.text.muted,
        fontWeight: typography.weight.medium,
      },
    },
    text
  );
}

function renderWeekdayChart(counts) {
  const safeCounts = Array.isArray(counts) && counts.length === 7 ? counts : new Array(7).fill(0);
  const max = Math.max(...safeCounts, 1);
  const maxIndex = safeCounts.findIndex((value) => value === max);

  const barWidth = 18;
  const barGap = 4;

  const bars = safeCounts.map((count, index) => {
    const height = Math.max(10, Math.round((count / max) * WEEKDAY_BAR_HEIGHT));
    const isHighlight = index === maxIndex;
    const barStyle = {
      width: barWidth,
      height,
      borderRadius: 4,
      backgroundImage: isHighlight
        ? "linear-gradient(180deg, rgba(241, 179, 117, 0.85), rgba(255, 255, 255, 0.7))"
        : "linear-gradient(180deg, rgba(16, 163, 127, 0.65), rgba(255, 255, 255, 0.6))",
      border: `1px solid ${isHighlight ? "rgba(241, 179, 117, 0.5)" : "rgba(16, 163, 127, 0.3)"}`,
    };
    return h("div", { style: barStyle });
  });

  const labels = WEEKDAY_LABELS.map((label, index) => {
    const isHighlight = index === maxIndex;
    return h(
      "div",
      {
        style: {
          width: barWidth,
          fontSize: typography.size.xs,
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
    { style: { display: "flex", flexDirection: "column", gap: spacing[2] } },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: barGap,
          height: WEEKDAY_BAR_HEIGHT + 8,
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
          gap: barGap,
        },
      },
      labels
    )
  );
}

function renderHeatmap(activity, maxDailyCount, year) {
  const dailyCounts = activity.dailyCounts || {};
  const maxStreakDays = new Set(activity.maxStreakDays || []);
  const selectedYear = year || new Date().getFullYear();
  const weeks = generateWeeksForYear(selectedYear);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const weekIndexByDate = new Map();
  weeks.forEach((week, index) => {
    week.forEach((dateKey) => {
      if (dateKey) weekIndexByDate.set(dateKey, index);
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
    const width = entry.span * HEAT_CELL + Math.max(entry.span - 1, 0) * HEAT_GAP;
    return h(
      "div",
      {
        style: {
          width,
          fontSize: typography.size.xs,
          color: colors.text.muted,
          textAlign: "left",
          textTransform: "uppercase",
          letterSpacing: 1,
        },
      },
      months[entry.monthIndex] || "--"
    );
  });

  const heatmapColumns = weeks.map((week) => {
    const cells = week.map((dateKey) => {
      if (!dateKey) {
        return h("div", { style: { width: HEAT_CELL, height: HEAT_CELL, visibility: "hidden" } });
      }
      const count = dailyCounts[dateKey] || 0;
      const level = getIntensityLevel(count, maxDailyCount);
      const isStreak = maxStreakDays.has(dateKey);
      const border = isStreak ? `1px solid ${colors.accent.strong}` : "1px solid rgba(35, 31, 25, 0.05)";
      const boxShadow = isStreak ? "0 0 6px rgba(16, 163, 127, 0.35)" : "none";
      return h(
        "div",
        {
          style: {
            width: HEAT_CELL,
            height: HEAT_CELL,
            borderRadius: 3,
            backgroundColor: colors.heatmap[Math.min(level, colors.heatmap.length - 1)],
            border,
            boxShadow,
          },
        },
        ""
      );
    });

    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: HEAT_GAP } },
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
        gap: spacing[1],
        fontSize: typography.size.xs,
        color: colors.text.muted,
      },
    },
    h("span", null, "Less"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: 4 } },
      colors.heatmap.slice(0, 6).map((color) =>
        h("div", { style: { width: 9, height: 9, borderRadius: 3, backgroundColor: color } })
      )
    ),
    h("span", null, "More")
  );

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: spacing[2] } },
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: HEAT_GAP } },
      monthLabels
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: HEAT_GAP } },
      heatmapColumns
    ),
    heatmapFoot
  );
}

function renderModelList(items, formatter) {
  if (!items.length) {
    return h(
      "div",
      {
        style: {
          backgroundColor: colors.surfaceStrong,
          borderRadius: 12,
          border: "1px solid rgba(48, 36, 24, 0.06)",
          padding: 12,
          fontSize: typography.size.sm,
          color: colors.text.muted,
        },
      },
      "No data yet."
    );
  }

  return h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: spacing[2] } },
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
            gap: spacing[1],
          },
        },
        h(
          "div",
          { style: { width: 28, textAlign: "right", fontWeight: typography.weight.bold, color: colors.accent.primary } },
          String(index + 1).padStart(2, "0")
        ),
        h(
          "div",
          { style: { flex: 1 } },
          h("span", { style: { fontSize: typography.size.md } }, item.name)
        ),
        h(
          "div",
          { style: { fontSize: typography.size.sm, color: colors.text.muted, textAlign: "right" } },
          formatter.format(item.tokens ?? 0)
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
  const topModels = models.slice(0, 3);

  const header = h(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: spacing[2] } },
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" } },
      h(
        "div",
        { style: { display: "flex", flexDirection: "row", gap: spacing[3], alignItems: "center" } },
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
              fontSize: typography.size.lg,
              fontWeight: typography.weight.bold,
            },
          },
          "C"
        ),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 4 } },
          h(
            "span",
            { style: { fontSize: typography.size["5xl"], fontWeight: typography.weight.bold } },
            config.title || "Codex"
          ),
          h(
            "span",
            { style: { fontSize: typography.size.sm, color: colors.text.muted } },
            config.subtitle || "Your year in the Codex CLI"
          )
        )
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 } },
        h(
          "span",
          {
            style: {
              textTransform: "uppercase",
              fontSize: typography.size.xs,
              letterSpacing: 1.6,
              color: colors.text.faint,
            },
          },
          "wrapped"
        ),
        h(
          "span",
          { style: { fontSize: typography.size["7xl"], fontWeight: typography.weight.bold, color: colors.accent.strong, letterSpacing: 2 } },
          String(year)
        )
      )
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[1] } },
      h(
        "div",
        {
          style: {
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 999,
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            border: `1px solid ${colors.border}`,
            fontSize: typography.size.xs,
            color: colors.text.muted,
            display: "flex",
            flexDirection: "row",
            gap: 6,
            alignItems: "center",
          },
        },
        h(
          "span",
          { style: { color: colors.text.faint, textTransform: "uppercase", letterSpacing: 1.2 } },
          "Generated"
        ),
        h("span", { style: { color: colors.text.primary, fontWeight: typography.weight.medium } }, generatedAt),
        h("span", { style: { opacity: 0.5 } }, "•"),
        h(
          "span",
          { style: { color: colors.text.faint, textTransform: "uppercase", letterSpacing: 1.2 } },
          "Sessions"
        ),
        h("span", { style: { color: colors.text.primary, fontWeight: typography.weight.medium } }, sessionsCount)
      )
    )
  );

  const topStats = h(
    "div",
    { style: { display: "flex", flexDirection: "row", gap: spacing[2] } },
    statCard([
      labelText("Started"),
      h(
        "span",
        { style: { fontSize: typography.size.sm, color: colors.text.muted } },
        formatLongDate(summary.firstSessionDate, locale, timeZone)
      ),
      h(
        "span",
        { style: { fontSize: typography.size["4xl"], fontWeight: typography.weight.bold } },
        `${numberFormatter.format(summary.daysSinceFirstSession || 0)} days ago`
      ),
    ]),
    statCard([
      labelText("Most Active Day"),
      h(
        "span",
        { style: { fontSize: typography.size.sm, color: colors.text.muted } },
        mostActiveWeekday
      ),
      h(
        "span",
        { style: { fontSize: typography.size["4xl"], fontWeight: typography.weight.bold } },
        mostActiveDate
      ),
      h(
        "span",
        { style: { fontSize: typography.size.sm, color: colors.text.muted } },
        `${formatCompact(mostActiveDay?.count || 0)} turns`
      ),
    ]),
    statCard([
      labelText("Weekly Activity"),
      renderWeekdayChart(activity.weekdayCounts || []),
    ])
  );

  const heatmapPanel = panel([
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" } },
      h("span", { style: { fontSize: typography.size.xl, fontWeight: typography.weight.bold } }, "Activity"),
      h(
        "span",
        { style: { fontSize: typography.size.xs, color: colors.text.muted } },
        `Jan - Dec | ${formatCompact(summary.maxDailyCount || 0)} max/day`
      )
    ),
    renderHeatmap(activity, summary.maxDailyCount || 0, year),
  ]);

  const highlightBlock = h(
    "div",
    {
      style: {
        backgroundImage: "linear-gradient(145deg, rgba(16, 163, 127, 0.12), rgba(255, 255, 255, 0.8))",
        borderRadius: layout.radius.md,
        padding: 10,
        border: "1px solid rgba(16, 163, 127, 0.2)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      },
    },
    h(
      "span",
      {
        style: {
          fontSize: typography.size.xs,
          textTransform: "uppercase",
          letterSpacing: 1.4,
          color: colors.text.muted,
          fontWeight: typography.weight.medium,
        },
      },
      config.highlight_label || "Signal"
    ),
    h(
      "span",
      { style: { fontSize: typography.size["2xl"], fontWeight: typography.weight.bold } },
      highlightModel ? highlightModel.name : "No data"
    ),
    h(
      "span",
      { style: { fontSize: typography.size.sm, color: colors.text.muted } },
      highlightModel
        ? `${shortFormatter.format(highlightModel.tokens)} tokens | ${currencyFormatter.format(highlightModel.costUSD || 0)}`
        : "Run the data build"
    )
  );

  const topModelsPanel = panel([
    sectionHeader("Top Models", "By total tokens"),
    highlightBlock,
    renderModelList(topModels, shortFormatter),
  ], { flex: 1 });

  const cachePanel = panel([
    sectionHeader("Cache Efficiency", "Prompt caching impact"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[2] } },
      [
        { label: "Cache Read", value: formatCompact(summary.cachedInputTokens || 0) },
        { label: "Cache Hit", value: `${((summary.cacheHitRate || 0) * 100).toFixed(1)}%` },
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
              width: 160,
              flexGrow: 1,
            },
          },
          h("span", { style: { fontSize: typography.size.xs, color: colors.text.muted } }, metric.label),
          h("span", { style: { fontSize: typography.size.lg, fontWeight: typography.weight.bold } }, metric.value)
        )
      )
    ),
  ], { flex: 1 });

  const totalsPanel = panel([
    sectionHeader("Totals", "Year-wide snapshot"),
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing[2] } },
      [
        { label: "Sessions", value: numberFormatter.format(summary.sessions || 0) },
        { label: "Turns", value: formatCompact(summary.turns || 0) },
        { label: "Total Tokens", value: formatCompact(summary.totalTokens || 0) },
        { label: "Cost", value: currencyFormatter.format(summary.costUSD || 0) },
        { label: "Max Streak", value: `${summary.maxStreak || 0} days` },
        { label: "Cache Hit Rate", value: `${((summary.cacheHitRate || 0) * 100).toFixed(1)}%` },
      ].map((stat) =>
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
              width: 150,
            },
          },
          h("span", { style: { fontSize: typography.size.xs, color: colors.text.muted } }, stat.label),
          h("span", { style: { fontSize: typography.size["2xl"], fontWeight: typography.weight.bold } }, stat.value)
        )
      )
    ),
  ], { padding: 18 });

  const footer = h(
    "div",
    { style: { textAlign: "center", fontSize: typography.size.xs, color: colors.text.faint } },
    "@stometaverse"
  );

  return h(
    "div",
    {
      style: {
        width: layout.canvas.width,
        height: layout.canvas.height,
        display: "flex",
        flexDirection: "column",
        gap: spacing[3],
        paddingLeft: layout.padding.horizontal,
        paddingRight: layout.padding.horizontal,
        paddingTop: layout.padding.top,
        paddingBottom: layout.padding.bottom,
        fontFamily: typography.fontFamily,
        color: colors.text.primary,
        backgroundColor: colors.background,
        backgroundImage:
          `radial-gradient(circle at 15% 10%, rgba(16, 163, 127, 0.18), transparent 52%), ` +
          `radial-gradient(circle at 85% 15%, rgba(241, 179, 117, 0.24), transparent 55%), ` +
          `radial-gradient(circle at 70% 85%, rgba(229, 139, 122, 0.2), transparent 60%), ` +
          `linear-gradient(160deg, ${colors.background}, ${colors.backgroundAlt})`,
      },
    },
    header,
    topStats,
    heatmapPanel,
    h(
      "div",
      { style: { display: "flex", flexDirection: "row", gap: spacing[2] } },
      topModelsPanel,
      cachePanel
    ),
    totalsPanel,
    footer
  );
}
