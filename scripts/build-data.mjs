#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const DEFAULT_CONFIG_PATH = path.resolve("codex-wrapped.config.yaml");

const DEFAULT_CONFIG = {
  defaults: {
    year: "current",
    codex_home: "~/.codex",
    sessions_subdir: "sessions",
    pricing_source: "lite_llm",
    pricing_url: "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
    pricing: "./pricing.yaml",
    output: "./dashboard/data.json",
    locale: "en-US",
    timezone: "local",
    fallback_model: "gpt-5",
  },
  dashboard: {
    title: "Codex",
    subtitle: "Your year in the Codex CLI",
    highlight_label: "Signal",
  },
};

const LITELLM_PRICING_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const DEFAULT_PROVIDER_PREFIXES = ["openai/", "azure/", "openrouter/openai/"];
const DEFAULT_CODEX_ALIASES = {
  "gpt-5-codex": "gpt-5",
};
const DEFAULT_TIERED_THRESHOLD = 200_000;

function parseSimpleYaml(content) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const match = /^([^:]+):(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const key = match[1].trim();
    const rawValue = match[2].trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;
    if (rawValue === "") {
      const next = {};
      parent[key] = next;
      stack.push({ indent, value: next });
      continue;
    }

    parent[key] = parseYamlValue(rawValue);
  }

  return root;
}

function parseYamlValue(value) {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && String(numeric) === value) {
    return numeric;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

async function loadYamlFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return parseSimpleYaml(content);
  } catch {
    return null;
  }
}

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function ensureNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeRawUsage(value) {
  if (value == null || typeof value !== "object") {
    return null;
  }

  const record = value;
  const input = ensureNumber(record.input_tokens);
  const cached = ensureNumber(record.cached_input_tokens ?? record.cache_read_input_tokens);
  const output = ensureNumber(record.output_tokens);
  const reasoning = ensureNumber(record.reasoning_output_tokens);
  const total = ensureNumber(record.total_tokens);

  return {
    input_tokens: input,
    cached_input_tokens: cached,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: total > 0 ? total : input + output,
  };
}

function subtractRawUsage(current, previous) {
  return {
    input_tokens: Math.max(current.input_tokens - (previous?.input_tokens ?? 0), 0),
    cached_input_tokens: Math.max(current.cached_input_tokens - (previous?.cached_input_tokens ?? 0), 0),
    output_tokens: Math.max(current.output_tokens - (previous?.output_tokens ?? 0), 0),
    reasoning_output_tokens: Math.max(current.reasoning_output_tokens - (previous?.reasoning_output_tokens ?? 0), 0),
    total_tokens: Math.max(current.total_tokens - (previous?.total_tokens ?? 0), 0),
  };
}

function convertToDelta(raw) {
  const total = raw.total_tokens > 0 ? raw.total_tokens : raw.input_tokens + raw.output_tokens;
  const cached = Math.min(raw.cached_input_tokens, raw.input_tokens);

  return {
    inputTokens: raw.input_tokens,
    cachedInputTokens: cached,
    outputTokens: raw.output_tokens,
    reasoningOutputTokens: raw.reasoning_output_tokens,
    totalTokens: total,
  };
}

function asNonEmptyString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function extractModel(value) {
  if (value == null || typeof value !== "object") {
    return undefined;
  }

  const payload = value;

  const infoCandidate = payload.info;
  if (infoCandidate && typeof infoCandidate === "object") {
    const info = infoCandidate;
    const directCandidates = [info.model, info.model_name];
    for (const candidate of directCandidates) {
      const model = asNonEmptyString(candidate);
      if (model) return model;
    }

    if (info.metadata && typeof info.metadata === "object") {
      const model = asNonEmptyString(info.metadata.model);
      if (model) return model;
    }
  }

  const fallbackModel = asNonEmptyString(payload.model);
  if (fallbackModel) return fallbackModel;

  if (payload.metadata && typeof payload.metadata === "object") {
    const model = asNonEmptyString(payload.metadata.model);
    if (model) return model;
  }

  return undefined;
}

async function listJsonlFiles(rootDir) {
  const files = [];

  async function walk(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function calculateStreaks(dailyActivity, year) {
  const activeDates = Array.from(dailyActivity.keys())
    .filter((date) => date.startsWith(String(year)))
    .sort();

  if (activeDates.length === 0) {
    return { maxStreak: 0, currentStreak: 0, maxStreakDays: new Set() };
  }

  let maxStreak = 1;
  let tempStreak = 1;
  let tempStreakStart = 0;
  let maxStreakStart = 0;
  let maxStreakEnd = 0;

  for (let i = 1; i < activeDates.length; i++) {
    const prevDate = new Date(activeDates[i - 1]);
    const currDate = new Date(activeDates[i]);
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
        maxStreakStart = tempStreakStart;
        maxStreakEnd = i;
      }
    } else {
      tempStreak = 1;
      tempStreakStart = i;
    }
  }

  const maxStreakDays = new Set();
  for (let i = maxStreakStart; i <= maxStreakEnd; i++) {
    maxStreakDays.add(activeDates[i]);
  }

  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const currentStreak = dailyActivity.has(today)
    ? countStreakBackwards(dailyActivity, new Date())
    : dailyActivity.has(yesterday)
    ? countStreakBackwards(dailyActivity, new Date(Date.now() - 24 * 60 * 60 * 1000))
    : 0;

  return { maxStreak, currentStreak, maxStreakDays };
}

function countStreakBackwards(dailyActivity, startDate) {
  let streak = 1;
  let checkDate = new Date(startDate);

  while (true) {
    checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    if (dailyActivity.has(toDateKey(checkDate))) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function findMostActiveDay(dailyActivity) {
  if (dailyActivity.size === 0) {
    return null;
  }

  let maxDate = "";
  let maxCount = 0;

  for (const [date, count] of dailyActivity.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxDate = date;
    }
  }

  if (!maxDate) return null;

  return {
    date: maxDate,
    count: maxCount,
    formattedDate: formatShortDate(maxDate),
  };
}

function toPerToken(value) {
  if (value == null) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric > 1e-3 ? numeric / 1_000_000 : numeric;
}

function normalizePricingEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const record = entry;

  const input = toPerToken(record.input_cost_per_token ?? record.input_cost_per_mtoken);
  const output = toPerToken(record.output_cost_per_token ?? record.output_cost_per_mtoken);
  const cacheRead = toPerToken(
    record.cache_read_input_token_cost ??
      record.cache_read_input_cost_per_mtoken ??
      record.cached_input_cost_per_mtoken
  );
  const cacheCreation = toPerToken(
    record.cache_creation_input_token_cost ??
      record.cache_creation_input_cost_per_mtoken ??
      record.cache_write_input_cost_per_mtoken
  );

  const inputAbove = toPerToken(
    record.input_cost_per_token_above_200k_tokens ??
      record.input_cost_per_mtoken_above_200k_tokens
  );
  const outputAbove = toPerToken(
    record.output_cost_per_token_above_200k_tokens ??
      record.output_cost_per_mtoken_above_200k_tokens
  );
  const cacheReadAbove = toPerToken(
    record.cache_read_input_token_cost_above_200k_tokens ??
      record.cache_read_input_cost_per_mtoken_above_200k_tokens ??
      record.cached_input_cost_per_mtoken_above_200k_tokens
  );
  const cacheCreationAbove = toPerToken(
    record.cache_creation_input_token_cost_above_200k_tokens ??
      record.cache_creation_input_cost_per_mtoken_above_200k_tokens ??
      record.cache_write_input_cost_per_mtoken_above_200k_tokens
  );

  return {
    input_cost_per_token: input,
    output_cost_per_token: output,
    cache_read_input_token_cost: cacheRead,
    cache_creation_input_token_cost: cacheCreation,
    input_cost_per_token_above_200k_tokens: inputAbove,
    output_cost_per_token_above_200k_tokens: outputAbove,
    cache_read_input_token_cost_above_200k_tokens: cacheReadAbove,
    cache_creation_input_token_cost_above_200k_tokens: cacheCreationAbove,
  };
}

function mergePricingOverrides(dataset, pricingConfig) {
  const models = pricingConfig?.models || {};
  for (const [name, entry] of Object.entries(models)) {
    const normalized = normalizePricingEntry(entry);
    if (normalized && !dataset[name]) {
      dataset[name] = normalized;
    }
  }
}

async function fetchLiteLLMPricingDataset(url) {
  console.warn("Fetching latest model pricing from LiteLLM...");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch pricing data: ${response.status} ${response.statusText}`);
  }

  const rawDataset = await response.json();
  const dataset = {};
  for (const [modelName, modelData] of Object.entries(rawDataset)) {
    const normalized = normalizePricingEntry(modelData);
    if (normalized) {
      dataset[modelName] = normalized;
    }
  }
  return dataset;
}

async function loadPricingDataset(configDefaults, pricingConfig) {
  const source = (configDefaults.pricing_source || "lite_llm").toLowerCase();
  const url = configDefaults.pricing_url || LITELLM_PRICING_URL;
  let dataset = {};
  let sourceUsed = "yaml";
  let fetchError = null;

  if (source !== "yaml") {
    try {
      dataset = await fetchLiteLLMPricingDataset(url);
      sourceUsed = "lite_llm";
    } catch (error) {
      fetchError = error;
      console.warn("Failed to fetch LiteLLM pricing, falling back to local pricing.yaml.");
    }
  }

  mergePricingOverrides(dataset, pricingConfig);

  const aliases = {
    ...DEFAULT_CODEX_ALIASES,
    ...(pricingConfig?.aliases || {}),
  };

  if (Object.keys(dataset).length === 0) {
    console.warn("No pricing entries loaded. Costs will be reported as $0.");
  }

  return {
    dataset,
    aliases,
    source: sourceUsed,
    url,
    fetchError: fetchError ? String(fetchError) : null,
  };
}

function stripProviderPrefix(model) {
  if (!model) return null;
  for (const prefix of DEFAULT_PROVIDER_PREFIXES) {
    if (model.startsWith(prefix)) {
      return model.slice(prefix.length);
    }
  }
  return null;
}

function buildPricingCandidates(model, aliases) {
  const candidates = new Set();
  const addCandidate = (value) => {
    if (value) {
      candidates.add(value);
    }
  };

  addCandidate(model);
  addCandidate(aliases[model]);

  const stripped = stripProviderPrefix(model);
  if (stripped) {
    addCandidate(stripped);
    addCandidate(aliases[stripped]);
  }

  const baseCandidates = Array.from(candidates);
  for (const candidate of baseCandidates) {
    if (candidate.endsWith("-codex")) {
      const trimmed = candidate.slice(0, -"-codex".length);
      addCandidate(trimmed);
      addCandidate(aliases[trimmed]);
    }
  }

  for (const candidate of Array.from(candidates)) {
    for (const prefix of DEFAULT_PROVIDER_PREFIXES) {
      addCandidate(`${prefix}${candidate}`);
    }
  }

  return Array.from(candidates);
}

function resolvePricing(model, pricingDataset, aliases) {
  if (!model) return null;
  const candidates = buildPricingCandidates(model, aliases);

  for (const candidate of candidates) {
    if (pricingDataset[candidate]) {
      return pricingDataset[candidate];
    }
  }

  const lower = model.toLowerCase();
  for (const [key, value] of Object.entries(pricingDataset)) {
    const comparison = key.toLowerCase();
    if (comparison.includes(lower) || lower.includes(comparison)) {
      return value;
    }
  }

  return null;
}

function calculateTieredCost(totalTokens, basePrice, tieredPrice, threshold = DEFAULT_TIERED_THRESHOLD) {
  if (!totalTokens || totalTokens <= 0) return 0;
  if (totalTokens > threshold && tieredPrice != null) {
    const tokensBelow = Math.min(totalTokens, threshold);
    const tokensAbove = Math.max(0, totalTokens - threshold);
    let cost = tokensAbove * tieredPrice;
    if (basePrice != null) {
      cost += tokensBelow * basePrice;
    }
    return cost;
  }

  if (basePrice != null) {
    return totalTokens * basePrice;
  }

  return 0;
}

function calculateCostUSD(usage, pricing) {
  if (!pricing) return 0;
  const nonCachedInput = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
  const cachedInput = Math.min(usage.cachedInputTokens, usage.inputTokens);

  const inputCost = calculateTieredCost(
    nonCachedInput,
    pricing.input_cost_per_token,
    pricing.input_cost_per_token_above_200k_tokens
  );

  const cachedCost = calculateTieredCost(
    cachedInput,
    pricing.cache_read_input_token_cost ?? pricing.input_cost_per_token,
    pricing.cache_read_input_token_cost_above_200k_tokens ?? pricing.input_cost_per_token_above_200k_tokens
  );

  const outputCost = calculateTieredCost(
    usage.outputTokens,
    pricing.output_cost_per_token,
    pricing.output_cost_per_token_above_200k_tokens
  );

  return inputCost + cachedCost + outputCost;
}

async function main() {
  const config = {
    ...DEFAULT_CONFIG,
    ...(await loadYamlFile(DEFAULT_CONFIG_PATH)),
  };
  config.defaults = { ...DEFAULT_CONFIG.defaults, ...(config.defaults || {}) };
  config.dashboard = { ...DEFAULT_CONFIG.dashboard, ...(config.dashboard || {}) };

  const locale = config.defaults.locale || "en-US";
  const timezone = config.defaults.timezone || "local";
  const dashboardConfig = { ...config.dashboard, locale, timezone };

  const yearValue = config.defaults.year;
  const year = yearValue === "current" ? new Date().getFullYear() : Number(yearValue) || new Date().getFullYear();

  const codexHome = expandHome(config.defaults.codex_home);
  const sessionsDir = path.join(codexHome, config.defaults.sessions_subdir || "sessions");

  const pricingPath = path.resolve(config.defaults.pricing);
  const pricingConfig = (await loadYamlFile(pricingPath)) || {};
  const pricingState = await loadPricingDataset(config.defaults, pricingConfig);
  const pricingDataset = pricingState.dataset;
  const pricingAliases = pricingState.aliases;

  const sessionFiles = await listJsonlFiles(sessionsDir);
  const fallbackModel = config.defaults.fallback_model || "gpt-5";

  const events = [];
  const allEventDates = [];

  for (const file of sessionFiles) {
    const rel = path.relative(sessionsDir, file).split(path.sep).join("/");
    const sessionId = rel.replace(/\.jsonl$/i, "");

    let previousTotals = null;
    let currentModel;
    let currentModelIsFallback = false;

    let content;
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        continue;
      }

      if (!parsed || typeof parsed !== "object") continue;

      const entryType = parsed.type;
      const payload = parsed.payload;
      const timestamp = parsed.timestamp;

      if (entryType === "turn_context") {
        const model = extractModel(payload);
        if (model) {
          currentModel = model;
          currentModelIsFallback = false;
        }
        continue;
      }

      if (entryType !== "event_msg") continue;
      if (!payload || payload.type !== "token_count") continue;
      if (!timestamp) continue;

      const info = payload.info;
      const lastUsage = normalizeRawUsage(info?.last_token_usage);
      const totalUsage = normalizeRawUsage(info?.total_token_usage);

      let raw = lastUsage;
      if (!raw && totalUsage) {
        raw = subtractRawUsage(totalUsage, previousTotals);
      }

      if (totalUsage) {
        previousTotals = totalUsage;
      }

      if (!raw) continue;
      const delta = convertToDelta(raw);
      if (
        delta.inputTokens === 0 &&
        delta.cachedInputTokens === 0 &&
        delta.outputTokens === 0 &&
        delta.reasoningOutputTokens === 0
      ) {
        continue;
      }

      const extractedModel = extractModel({ ...payload, info });
      let isFallbackModel = false;
      if (extractedModel) {
        currentModel = extractedModel;
        currentModelIsFallback = false;
      }

      let model = extractedModel || currentModel;
      if (!model) {
        model = fallbackModel;
        isFallbackModel = true;
        currentModel = model;
        currentModelIsFallback = true;
      } else if (!extractedModel && currentModelIsFallback) {
        isFallbackModel = true;
      }

      const event = {
        sessionId,
        timestamp,
        model,
        inputTokens: delta.inputTokens,
        cachedInputTokens: delta.cachedInputTokens,
        outputTokens: delta.outputTokens,
        reasoningOutputTokens: delta.reasoningOutputTokens,
        totalTokens: delta.totalTokens,
        isFallbackModel: isFallbackModel || undefined,
      };

      events.push(event);
      allEventDates.push(new Date(timestamp));
    }
  }

  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const eventsForYear = events.filter((event) => new Date(event.timestamp).getFullYear() === year);
  const sessionIdsForYear = new Set(eventsForYear.map((event) => event.sessionId));

  const totals = {
    sessions: sessionIdsForYear.size,
    turns: eventsForYear.length,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
    costUSD: 0,
    fallbackEvents: 0,
  };

  const dailyActivity = new Map();
  const dailyTokens = new Map();
  const dailyCosts = new Map();
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
  const modelUsage = new Map();
  const unpricedModels = new Set();

  for (const event of eventsForYear) {
    totals.inputTokens += event.inputTokens;
    totals.cachedInputTokens += event.cachedInputTokens;
    totals.outputTokens += event.outputTokens;
    totals.reasoningOutputTokens += event.reasoningOutputTokens;
    totals.totalTokens += event.totalTokens;

    if (event.isFallbackModel) {
      totals.fallbackEvents += 1;
    }

    const date = new Date(event.timestamp);
    const dateKey = toDateKey(date);
    dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);
    dailyTokens.set(dateKey, (dailyTokens.get(dateKey) || 0) + event.totalTokens);

    const pricing = resolvePricing(event.model, pricingDataset, pricingAliases);
    if (!pricing) {
      unpricedModels.add(event.model);
    }

    const cost = calculateCostUSD(event, pricing);
    totals.costUSD += cost;

    dailyCosts.set(dateKey, (dailyCosts.get(dateKey) || 0) + cost);
    weekdayCounts[date.getDay()] += 1;

    const modelEntry = modelUsage.get(event.model) || { tokens: 0, inputTokens: 0, outputTokens: 0, costUSD: 0, count: 0, isFallback: false };
    modelEntry.tokens += event.totalTokens;
    modelEntry.inputTokens += event.inputTokens;
    modelEntry.outputTokens += event.outputTokens;
    modelEntry.costUSD += cost;
    modelEntry.count += 1;
    if (event.isFallbackModel) {
      modelEntry.isFallback = true;
    }
    modelUsage.set(event.model, modelEntry);

  }

  const cacheHitRate = totals.inputTokens > 0 ? totals.cachedInputTokens / totals.inputTokens : 0;
  const maxDailyCount = dailyActivity.size === 0 ? 0 : Math.max(...dailyActivity.values());

  const { maxStreak, currentStreak, maxStreakDays } = calculateStreaks(dailyActivity, year);
  const mostActiveDay = findMostActiveDay(dailyActivity);

  const firstSessionDate = allEventDates.length > 0
    ? new Date(Math.min(...allEventDates.map((d) => d.getTime())))
    : new Date();
  const daysSinceFirstSession = allEventDates.length > 0
    ? Math.floor((Date.now() - firstSessionDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const modelRows = Array.from(modelUsage.entries())
    .map(([name, entry]) => ({
      name,
      tokens: entry.tokens,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      costUSD: entry.costUSD,
      count: entry.count,
      isFallback: entry.isFallback,
      percentage: totals.totalTokens > 0 ? entry.tokens / totals.totalTokens : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 5);

  const dailyCountsObject = Object.fromEntries(dailyActivity.entries());
  const dailyTokensObject = Object.fromEntries(dailyTokens.entries());
  const dailyCostsObject = Object.fromEntries(dailyCosts.entries());

  const output = {
    year,
    generatedAt: new Date().toISOString(),
    config: dashboardConfig,
    summary: {
      sessions: totals.sessions,
      turns: totals.turns,
      inputTokens: totals.inputTokens,
      cachedInputTokens: totals.cachedInputTokens,
      outputTokens: totals.outputTokens,
      reasoningTokens: totals.reasoningOutputTokens,
      totalTokens: totals.totalTokens,
      costUSD: totals.costUSD,
      cacheHitRate,
      firstSessionDate: firstSessionDate.toISOString(),
      daysSinceFirstSession,
      maxStreak,
      currentStreak,
      mostActiveDay,
      maxDailyCount,
    },
    activity: {
      dailyCounts: dailyCountsObject,
      dailyTokens: dailyTokensObject,
      dailyCosts: dailyCostsObject,
      weekdayCounts,
      maxStreakDays: Array.from(maxStreakDays),
    },
    models: modelRows,
    notes: {
      unpricedModels: Array.from(unpricedModels),
      fallbackEvents: totals.fallbackEvents,
      sessionsDir,
      pricingSource: pricingState.source,
      pricingUrl: pricingState.url,
      pricingFetchError: pricingState.fetchError,
    },
  };

  const outputPath = path.resolve(config.defaults.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

  const emptyWarning = eventsForYear.length === 0
    ? "No Codex events found for the requested year."
    : null;

  console.log(`Wrote dashboard data to ${outputPath}`);
  if (emptyWarning) {
    console.log(emptyWarning);
  }
}

main().catch((error) => {
  console.error("Failed to build Codex Wrapped data:", error);
  process.exit(1);
});
