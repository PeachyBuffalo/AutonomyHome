#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PROVIDER_CONFIG_PATH = path.join(
  process.cwd(),
  "data",
  "social-provider-config.mi.json"
);
const LEGACY_INPUT_PATH = path.join(process.cwd(), "data", "social-sentiment.json");

type SourceType = "OFFICIAL_PAGE" | "PUBLIC_MENTION";

type SentimentMentionInput = {
  jurisdictionSlug: string;
  platform: string;
  sourceType?: SourceType;
  authorHandle?: string | null;
  postUrl: string;
  postText?: string;
  postedAt: string;
};

type SentimentInputFile = {
  windowDays?: number;
  mentions?: SentimentMentionInput[];
};

type ProviderCollectionResult = {
  providerId: string;
  mentions: SentimentMentionInput[];
  note?: string;
};

type XJurisdictionConfig = {
  officialHandles?: string[];
  searchQueries?: string[];
};

type FacebookJurisdictionConfig = {
  pageIds?: string[];
};

type NeighborhoodJurisdictionConfig = {
  subreddits?: string[];
  keywords?: string[];
};

type JurisdictionSocialConfig = {
  slug: string;
  x?: XJurisdictionConfig;
  facebook?: FacebookJurisdictionConfig;
  neighborhood?: NeighborhoodJurisdictionConfig;
};

type ProviderConfigFile = {
  windowDays?: number;
  fallbackInputPath?: string;
  providers?: {
    file?: {
      enabled?: boolean;
      inputPath?: string;
    };
    x?: {
      enabled?: boolean;
      bearerTokenEnv?: string;
      maxResultsPerQuery?: number;
    };
    facebook?: {
      enabled?: boolean;
      accessTokenEnv?: string;
      maxPostsPerPage?: number;
    };
    neighborhood?: {
      enabled?: boolean;
      maxResultsPerQuery?: number;
    };
    nextdoor?: {
      enabled?: boolean;
      exportPathEnv?: string;
      exportFilePath?: string;
    };
  };
  jurisdictions?: JurisdictionSocialConfig[];
};

type LoadedProviderConfig = {
  configPath: string;
  windowDays: number;
  fallbackInputPath?: string;
  providers: NonNullable<ProviderConfigFile["providers"]>;
  jurisdictions: JurisdictionSocialConfig[];
  inlineMentions: SentimentMentionInput[];
};

const POSITIVE_TERMS = [
  "improved",
  "smooth",
  "quick",
  "clearly",
  "helpful",
  "professional",
  "transparent",
  "reduced",
  "clear",
  "easy",
] as const;

const NEGATIVE_TERMS = [
  "confusing",
  "slow",
  "frustrating",
  "delay",
  "delays",
  "longer",
  "difficult",
  "hard",
  "problem",
  "complaint",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry): entry is string => entry.length > 0);
}

function normalizeSourceType(value: unknown): SourceType {
  return value === "OFFICIAL_PAGE" ? "OFFICIAL_PAGE" : "PUBLIC_MENTION";
}

function normalizeMention(
  raw: unknown,
  fallback: Partial<Pick<SentimentMentionInput, "platform" | "sourceType">> = {}
): SentimentMentionInput | null {
  if (!isRecord(raw)) return null;

  const jurisdictionSlug = toTrimmedString(raw.jurisdictionSlug);
  const platform =
    toTrimmedString(raw.platform) ??
    (fallback.platform ? fallback.platform.trim() : "");
  const postUrl = toTrimmedString(raw.postUrl);
  const postedAt = toTrimmedString(raw.postedAt);

  if (!jurisdictionSlug || !platform || !postUrl || !postedAt) {
    return null;
  }

  const parsedDate = new Date(postedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const authorHandleValue = toTrimmedString(raw.authorHandle);
  const authorHandle = authorHandleValue
    ? authorHandleValue.replace(/^@/, "")
    : null;

  const postText = toTrimmedString(raw.postText) ?? undefined;

  return {
    jurisdictionSlug,
    platform: platform.toLowerCase(),
    sourceType: normalizeSourceType(raw.sourceType ?? fallback.sourceType),
    authorHandle,
    postUrl,
    postText,
    postedAt: parsedDate.toISOString(),
  };
}

function normalizeMentions(rawMentions: unknown[]): SentimentMentionInput[] {
  const normalized: SentimentMentionInput[] = [];
  for (const raw of rawMentions) {
    const mention = normalizeMention(raw);
    if (mention) normalized.push(mention);
  }
  return normalized;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function analyzeSentiment(text: string): {
  score: number;
  label: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  confidence: number;
} {
  const normalized = text.toLowerCase();
  const positive = POSITIVE_TERMS.filter((word) => normalized.includes(word)).length;
  const negative = NEGATIVE_TERMS.filter((word) => normalized.includes(word)).length;
  const denominator = Math.max(1, positive + negative);
  const score = Math.max(-1, Math.min(1, (positive - negative) / denominator));
  const label = score > 0.2 ? "POSITIVE" : score < -0.2 ? "NEGATIVE" : "NEUTRAL";
  const confidence = Math.min(1, 0.3 + denominator * 0.2);
  return { score, label, confidence };
}

function normalizeHtmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 12000
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPostTextFromUrl(postUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    if (postUrl.includes("reddit.com")) {
      const redditJsonUrl = postUrl.includes(".json")
        ? postUrl
        : `${postUrl.replace(/\/$/, "")}.json`;
      const redditPayload = await fetchJsonWithTimeout(
        redditJsonUrl,
        {
          headers: { "User-Agent": "autonomy-home-sentiment-bot/1.0" },
        },
        12000
      );
      if (Array.isArray(redditPayload)) {
        const postData = (redditPayload[0] as any)?.data?.children?.[0]?.data;
        const title = typeof postData?.title === "string" ? postData.title : "";
        const selfText = typeof postData?.selftext === "string" ? postData.selftext : "";
        const text = `${title} ${selfText}`.trim();
        if (text) return text.slice(0, 5000);
      }
    }

    const response = await fetch(postUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "autonomy-home-sentiment-bot/1.0" },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const text = normalizeHtmlToText(html);
    return text ? text.slice(0, 5000) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolvePathFromConfig(configPath: string, maybeRelativePath: string): string {
  if (path.isAbsolute(maybeRelativePath)) return maybeRelativePath;
  const cwdResolved = path.resolve(process.cwd(), maybeRelativePath);
  if (fs.existsSync(cwdResolved)) return cwdResolved;
  const configDir = path.dirname(configPath);
  return path.resolve(configDir, maybeRelativePath);
}

function loadMentionsFromFile(inputPath: string): SentimentMentionInput[] {
  if (!fs.existsSync(inputPath)) return [];

  const payload = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as unknown;
  if (!isRecord(payload)) return [];

  const rawMentions = Array.isArray(payload.mentions) ? payload.mentions : [];
  return normalizeMentions(rawMentions);
}

function loadProviderConfig(inputPath?: string): LoadedProviderConfig {
  const requestedPath = inputPath ? path.resolve(process.cwd(), inputPath) : DEFAULT_PROVIDER_CONFIG_PATH;

  if (!fs.existsSync(requestedPath)) {
    return {
      configPath: requestedPath,
      windowDays: 90,
      fallbackInputPath: LEGACY_INPUT_PATH,
      providers: {
        file: { enabled: true, inputPath: LEGACY_INPUT_PATH },
        x: { enabled: false, bearerTokenEnv: "X_BEARER_TOKEN", maxResultsPerQuery: 10 },
        facebook: { enabled: false, accessTokenEnv: "FACEBOOK_GRAPH_ACCESS_TOKEN", maxPostsPerPage: 10 },
        neighborhood: { enabled: false, maxResultsPerQuery: 10 },
        nextdoor: { enabled: false, exportPathEnv: "NEXTDOOR_EXPORT_PATH" },
      },
      jurisdictions: [],
      inlineMentions: [],
    };
  }

  const payload = JSON.parse(fs.readFileSync(requestedPath, "utf-8")) as unknown;

  if (isRecord(payload) && Array.isArray(payload.mentions) && !isRecord(payload.providers)) {
    return {
      configPath: requestedPath,
      windowDays: typeof payload.windowDays === "number" ? payload.windowDays : 90,
      fallbackInputPath: requestedPath,
      providers: {
        file: { enabled: true, inputPath: requestedPath },
        x: { enabled: false, bearerTokenEnv: "X_BEARER_TOKEN", maxResultsPerQuery: 10 },
        facebook: { enabled: false, accessTokenEnv: "FACEBOOK_GRAPH_ACCESS_TOKEN", maxPostsPerPage: 10 },
        neighborhood: { enabled: false, maxResultsPerQuery: 10 },
        nextdoor: { enabled: false, exportPathEnv: "NEXTDOOR_EXPORT_PATH" },
      },
      jurisdictions: [],
      inlineMentions: normalizeMentions(payload.mentions),
    };
  }

  const typedPayload = (isRecord(payload) ? payload : {}) as ProviderConfigFile;
  const providers = typedPayload.providers ?? {};

  const jurisdictions = Array.isArray(typedPayload.jurisdictions)
    ? typedPayload.jurisdictions
        .filter((entry): entry is JurisdictionSocialConfig => isRecord(entry) && typeof entry.slug === "string")
        .map((entry) => ({
          slug: entry.slug.trim(),
          x: entry.x
            ? {
                officialHandles: toStringArray(entry.x.officialHandles),
                searchQueries: toStringArray(entry.x.searchQueries),
              }
            : undefined,
          facebook: entry.facebook
            ? {
                pageIds: toStringArray(entry.facebook.pageIds),
              }
            : undefined,
          neighborhood: entry.neighborhood
            ? {
                subreddits: toStringArray(entry.neighborhood.subreddits),
                keywords: toStringArray(entry.neighborhood.keywords),
              }
            : undefined,
        }))
    : [];

  return {
    configPath: requestedPath,
    windowDays: typeof typedPayload.windowDays === "number" ? typedPayload.windowDays : 90,
    fallbackInputPath: typedPayload.fallbackInputPath,
    providers: {
      file: {
        enabled: providers.file?.enabled ?? true,
        inputPath: providers.file?.inputPath,
      },
      x: {
        enabled: providers.x?.enabled ?? false,
        bearerTokenEnv: providers.x?.bearerTokenEnv ?? "X_BEARER_TOKEN",
        maxResultsPerQuery: providers.x?.maxResultsPerQuery ?? 10,
      },
      facebook: {
        enabled: providers.facebook?.enabled ?? false,
        accessTokenEnv: providers.facebook?.accessTokenEnv ?? "FACEBOOK_GRAPH_ACCESS_TOKEN",
        maxPostsPerPage: providers.facebook?.maxPostsPerPage ?? 10,
      },
      neighborhood: {
        enabled: providers.neighborhood?.enabled ?? true,
        maxResultsPerQuery: providers.neighborhood?.maxResultsPerQuery ?? 10,
      },
      nextdoor: {
        enabled: providers.nextdoor?.enabled ?? false,
        exportPathEnv: providers.nextdoor?.exportPathEnv ?? "NEXTDOOR_EXPORT_PATH",
        exportFilePath: providers.nextdoor?.exportFilePath,
      },
    },
    jurisdictions,
    inlineMentions: [],
  };
}

async function collectFromFileProvider(config: LoadedProviderConfig): Promise<ProviderCollectionResult> {
  if (!config.providers.file?.enabled) {
    return { providerId: "file", mentions: [], note: "disabled" };
  }

  const inputPathCandidate =
    config.providers.file.inputPath ?? config.fallbackInputPath ?? LEGACY_INPUT_PATH;
  const inputPath = resolvePathFromConfig(config.configPath, inputPathCandidate);

  const mentionsFromFile = loadMentionsFromFile(inputPath);
  const inlineMentions = config.inlineMentions;
  const combined = dedupeMentionsByJurisdictionAndUrl([
    ...mentionsFromFile,
    ...inlineMentions,
  ]);

  const note = fs.existsSync(inputPath)
    ? `loaded from ${path.relative(process.cwd(), inputPath) || inputPath}`
    : `input missing (${path.relative(process.cwd(), inputPath) || inputPath})`;

  return {
    providerId: "file",
    mentions: combined,
    note,
  };
}

async function collectFromXProvider(
  config: LoadedProviderConfig,
  windowStart: Date
): Promise<ProviderCollectionResult> {
  if (!config.providers.x?.enabled) {
    return { providerId: "x", mentions: [], note: "disabled" };
  }

  const tokenEnv = config.providers.x.bearerTokenEnv ?? "X_BEARER_TOKEN";
  const token = process.env[tokenEnv];
  if (!token) {
    return {
      providerId: "x",
      mentions: [],
      note: `missing ${tokenEnv}`,
    };
  }

  const maxResults = clampNumber(config.providers.x.maxResultsPerQuery ?? 10, 10, 100);
  const mentions: SentimentMentionInput[] = [];

  for (const jurisdiction of config.jurisdictions) {
    const xConfig = jurisdiction.x;
    if (!xConfig) continue;

    const officialHandles = (xConfig.officialHandles ?? [])
      .map((handle) => handle.replace(/^@/, "").toLowerCase())
      .filter((handle) => handle.length > 0);
    const queryParts: string[] = [
      ...officialHandles.map((handle) => `from:${handle}`),
      ...(xConfig.searchQueries ?? []).map((term) => `(${term})`),
    ];

    if (queryParts.length === 0) continue;

    const query = `${queryParts.join(" OR ")} -is:retweet lang:en`;
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", query);
    url.searchParams.set("max_results", String(maxResults));
    url.searchParams.set("start_time", windowStart.toISOString());
    url.searchParams.set("tweet.fields", "created_at,text,author_id");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username");

    const payload = await fetchJsonWithTimeout(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "autonomy-home-sentiment-bot/1.0",
      },
    });

    if (!isRecord(payload)) continue;

    const users = new Map<string, string>();
    const includes = payload.includes;
    if (isRecord(includes) && Array.isArray(includes.users)) {
      for (const entry of includes.users) {
        if (!isRecord(entry)) continue;
        const id = toTrimmedString(entry.id);
        const username = toTrimmedString(entry.username);
        if (id && username) users.set(id, username.replace(/^@/, "").toLowerCase());
      }
    }

    const dataRows = Array.isArray(payload.data) ? payload.data : [];
    for (const row of dataRows) {
      if (!isRecord(row)) continue;

      const id = toTrimmedString(row.id);
      const text = toTrimmedString(row.text);
      const createdAt = toTrimmedString(row.created_at);
      const authorId = toTrimmedString(row.author_id);

      if (!id || !text || !createdAt) continue;
      const authorHandle = authorId ? users.get(authorId) ?? null : null;
      const postUrl = authorHandle
        ? `https://x.com/${authorHandle}/status/${id}`
        : `https://x.com/i/web/status/${id}`;

      const mention = normalizeMention(
        {
          jurisdictionSlug: jurisdiction.slug,
          platform: "x",
          sourceType:
            authorHandle && officialHandles.includes(authorHandle)
              ? "OFFICIAL_PAGE"
              : "PUBLIC_MENTION",
          authorHandle,
          postUrl,
          postText: text,
          postedAt: createdAt,
        },
        { platform: "x", sourceType: "PUBLIC_MENTION" }
      );

      if (mention) mentions.push(mention);
    }
  }

  return {
    providerId: "x",
    mentions: dedupeMentionsByJurisdictionAndUrl(mentions),
  };
}

async function collectFromFacebookProvider(
  config: LoadedProviderConfig,
  windowStart: Date
): Promise<ProviderCollectionResult> {
  if (!config.providers.facebook?.enabled) {
    return { providerId: "facebook", mentions: [], note: "disabled" };
  }

  const tokenEnv = config.providers.facebook.accessTokenEnv ?? "FACEBOOK_GRAPH_ACCESS_TOKEN";
  const token = process.env[tokenEnv];
  if (!token) {
    return {
      providerId: "facebook",
      mentions: [],
      note: `missing ${tokenEnv}`,
    };
  }

  const maxPostsPerPage = clampNumber(config.providers.facebook.maxPostsPerPage ?? 10, 1, 100);
  const mentions: SentimentMentionInput[] = [];

  for (const jurisdiction of config.jurisdictions) {
    const pageIds = jurisdiction.facebook?.pageIds ?? [];
    for (const pageId of pageIds) {
      const url = new URL(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/posts`);
      url.searchParams.set("fields", "id,message,created_time,permalink_url,from");
      url.searchParams.set("since", windowStart.toISOString());
      url.searchParams.set("limit", String(maxPostsPerPage));
      url.searchParams.set("access_token", token);

      const payload = await fetchJsonWithTimeout(url.toString(), {
        headers: {
          "User-Agent": "autonomy-home-sentiment-bot/1.0",
        },
      });
      if (!isRecord(payload) || !Array.isArray(payload.data)) continue;

      for (const row of payload.data) {
        if (!isRecord(row)) continue;

        const message = toTrimmedString(row.message);
        const createdAt = toTrimmedString(row.created_time);
        const permalink = toTrimmedString(row.permalink_url);

        if (!message || !createdAt || !permalink) continue;

        let authorHandle: string | null = null;
        if (isRecord(row.from)) {
          authorHandle = toTrimmedString(row.from.name) ?? null;
        }

        const mention = normalizeMention(
          {
            jurisdictionSlug: jurisdiction.slug,
            platform: "facebook",
            sourceType: "OFFICIAL_PAGE",
            authorHandle,
            postUrl: permalink,
            postText: message,
            postedAt: createdAt,
          },
          { platform: "facebook", sourceType: "OFFICIAL_PAGE" }
        );

        if (mention) mentions.push(mention);
      }
    }
  }

  return {
    providerId: "facebook",
    mentions: dedupeMentionsByJurisdictionAndUrl(mentions),
  };
}

async function collectFromNeighborhoodProvider(
  config: LoadedProviderConfig,
  windowStart: Date
): Promise<ProviderCollectionResult> {
  if (!config.providers.neighborhood?.enabled) {
    return { providerId: "neighborhood", mentions: [], note: "disabled" };
  }

  const maxResults = clampNumber(config.providers.neighborhood.maxResultsPerQuery ?? 10, 1, 25);
  const mentions: SentimentMentionInput[] = [];

  for (const jurisdiction of config.jurisdictions) {
    const neighborhood = jurisdiction.neighborhood;
    if (!neighborhood) continue;

    const subreddits = neighborhood.subreddits ?? [];
    const keywords = neighborhood.keywords ?? [];

    for (const subreddit of subreddits) {
      for (const keyword of keywords) {
        const url = new URL(`https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json`);
        url.searchParams.set("q", keyword);
        url.searchParams.set("restrict_sr", "1");
        url.searchParams.set("sort", "new");
        url.searchParams.set("t", "year");
        url.searchParams.set("limit", String(maxResults));

        const payload = await fetchJsonWithTimeout(url.toString(), {
          headers: {
            "User-Agent": "autonomy-home-sentiment-bot/1.0",
          },
        });

        const children = (payload as any)?.data?.children;
        if (!Array.isArray(children)) continue;

        for (const child of children) {
          const post = child?.data;
          if (!isRecord(post)) continue;

          const createdUtc = typeof post.created_utc === "number" ? post.created_utc : null;
          if (!createdUtc) continue;

          const postedAt = new Date(createdUtc * 1000);
          if (postedAt < windowStart) continue;

          const title = toTrimmedString(post.title) ?? "";
          const selfText = toTrimmedString(post.selftext) ?? "";
          const postText = `${title} ${selfText}`.trim();
          const permalink = toTrimmedString(post.permalink);
          const postUrl = permalink
            ? `https://www.reddit.com${permalink}`
            : toTrimmedString(post.url);
          if (!postText || !postUrl) continue;

          const mention = normalizeMention(
            {
              jurisdictionSlug: jurisdiction.slug,
              platform: "reddit",
              sourceType: "PUBLIC_MENTION",
              authorHandle: toTrimmedString(post.author),
              postUrl,
              postText,
              postedAt: postedAt.toISOString(),
            },
            { platform: "reddit", sourceType: "PUBLIC_MENTION" }
          );

          if (mention) mentions.push(mention);
        }
      }
    }
  }

  return {
    providerId: "neighborhood",
    mentions: dedupeMentionsByJurisdictionAndUrl(mentions),
    note: "reddit neighborhood feeds",
  };
}

async function collectFromNextdoorProvider(
  config: LoadedProviderConfig
): Promise<ProviderCollectionResult> {
  if (!config.providers.nextdoor?.enabled) {
    return { providerId: "nextdoor", mentions: [], note: "disabled" };
  }

  const exportPathEnv = config.providers.nextdoor.exportPathEnv ?? "NEXTDOOR_EXPORT_PATH";
  const exportPathCandidate =
    process.env[exportPathEnv] ?? config.providers.nextdoor.exportFilePath;

  if (!exportPathCandidate) {
    return {
      providerId: "nextdoor",
      mentions: [],
      note: `missing ${exportPathEnv}`,
    };
  }

  const exportPath = resolvePathFromConfig(config.configPath, exportPathCandidate);
  if (!fs.existsSync(exportPath)) {
    return {
      providerId: "nextdoor",
      mentions: [],
      note: `export missing (${path.relative(process.cwd(), exportPath) || exportPath})`,
    };
  }

  const payload = JSON.parse(fs.readFileSync(exportPath, "utf-8")) as unknown;
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.mentions)
      ? payload.mentions
      : [];

  const mentions: SentimentMentionInput[] = [];
  for (const row of rows) {
    const mention = normalizeMention(row, {
      platform: "nextdoor",
      sourceType: "PUBLIC_MENTION",
    });
    if (mention) mentions.push(mention);
  }

  return {
    providerId: "nextdoor",
    mentions: dedupeMentionsByJurisdictionAndUrl(mentions),
    note: `loaded from ${path.relative(process.cwd(), exportPath) || exportPath}`,
  };
}

function dedupeMentionsByJurisdictionAndUrl(
  mentions: SentimentMentionInput[]
): SentimentMentionInput[] {
  const deduped = new Map<string, SentimentMentionInput>();

  for (const mention of mentions) {
    const key = `${mention.jurisdictionSlug}::${mention.postUrl}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, mention);
      continue;
    }

    const existingTextLength = existing.postText?.length ?? 0;
    const nextTextLength = mention.postText?.length ?? 0;

    if (nextTextLength > existingTextLength) {
      deduped.set(key, mention);
      continue;
    }

    const existingPostedAt = new Date(existing.postedAt).getTime();
    const nextPostedAt = new Date(mention.postedAt).getTime();
    if (Number.isFinite(nextPostedAt) && nextPostedAt > existingPostedAt) {
      deduped.set(key, mention);
    }
  }

  return Array.from(deduped.values());
}

async function ensureSource(
  url: string,
  title: string,
  publisher: string | null,
  reliability: "OFFICIAL" | "OTHER"
) {
  const existing = await prisma.source.findUnique({ where: { url } });
  if (existing) return existing;

  return prisma.source.create({
    data: {
      url,
      title,
      publisher,
      reliability,
      retrievedDate: new Date(),
      contentType: "social_post",
      extractorId: "social-sentiment-v2",
    },
  });
}

async function updateSentimentMetricsForJurisdiction(
  jurisdiction: { id: string; name: string },
  windowStart: Date,
  now: Date
) {
  const [scoreMetricDef, countMetricDef, recentMentions] = await Promise.all([
    prisma.metricDef.findUnique({ where: { key: "community_sentiment_score_90d" } }),
    prisma.metricDef.findUnique({ where: { key: "community_sentiment_mentions_90d" } }),
    prisma.socialMention.findMany({
      where: {
        jurisdictionId: jurisdiction.id,
        postedAt: { gte: windowStart },
      },
      orderBy: { postedAt: "desc" },
    }),
  ]);

  if (!scoreMetricDef || !countMetricDef) return;

  const mentionsCount = recentMentions.length;
  const averageSentiment =
    mentionsCount > 0
      ? recentMentions.reduce((sum, mention) => sum + mention.sentimentScore, 0) / mentionsCount
      : null;
  const normalizedScore =
    averageSentiment === null ? null : Math.round((((averageSentiment + 1) / 2) * 100) * 10) / 10;

  const scoreMetricValue = await prisma.metricValue.upsert({
    where: {
      jurisdictionId_metricDefId: {
        jurisdictionId: jurisdiction.id,
        metricDefId: scoreMetricDef.id,
      },
    },
    create: {
      jurisdictionId: jurisdiction.id,
      metricDefId: scoreMetricDef.id,
      status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
      valueNumeric: normalizedScore,
      valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
      confidence: mentionsCount > 0 ? 0.65 : null,
      lastVerified: now,
      collectedAt: now,
      notes: "Derived from social post sentiment over the trailing 90 days.",
    },
    update: {
      status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
      valueNumeric: normalizedScore,
      valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
      confidence: mentionsCount > 0 ? 0.65 : null,
      lastVerified: now,
      collectedAt: now,
      notes: "Derived from social post sentiment over the trailing 90 days.",
    },
  });

  const countMetricValue = await prisma.metricValue.upsert({
    where: {
      jurisdictionId_metricDefId: {
        jurisdictionId: jurisdiction.id,
        metricDefId: countMetricDef.id,
      },
    },
    create: {
      jurisdictionId: jurisdiction.id,
      metricDefId: countMetricDef.id,
      status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
      valueNumeric: mentionsCount > 0 ? mentionsCount : null,
      valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
      confidence: mentionsCount > 0 ? 1 : null,
      lastVerified: now,
      collectedAt: now,
      notes: "Count of social posts analyzed over the trailing 90 days.",
    },
    update: {
      status: mentionsCount > 0 ? "DERIVED" : "UNKNOWN",
      valueNumeric: mentionsCount > 0 ? mentionsCount : null,
      valueText: mentionsCount > 0 ? null : "No social mentions collected in last 90 days.",
      confidence: mentionsCount > 0 ? 1 : null,
      lastVerified: now,
      collectedAt: now,
      notes: "Count of social posts analyzed over the trailing 90 days.",
    },
  });

  for (const mention of recentMentions.slice(0, 10)) {
    const source = await ensureSource(
      mention.postUrl,
      `${mention.platform} mention for ${jurisdiction.name}`,
      mention.authorHandle ? `@${mention.authorHandle}` : mention.platform,
      mention.sourceType === "OFFICIAL_PAGE" ? "OFFICIAL" : "OTHER"
    );

    const locatorText = `${mention.sentimentLabel.toLowerCase()} mention on ${mention.postedAt
      .toISOString()
      .slice(0, 10)}`;

    for (const metricValue of [scoreMetricValue, countMetricValue]) {
      const existing = await prisma.citation.findFirst({
        where: {
          metricValueId: metricValue.id,
          sourceId: source.id,
          locatorText,
        },
      });

      if (!existing) {
        await prisma.citation.create({
          data: {
            metricValueId: metricValue.id,
            sourceId: source.id,
            locatorText,
          },
        });
      }
    }
  }
}

async function main() {
  const configPathArg = process.argv[2];
  const loadedConfig = loadProviderConfig(configPathArg);

  const run = await prisma.collectionRun.create({
    data: {
      status: "RUNNING",
      trigger: "manual",
      source: "collect:sentiment",
      notes: `Sentiment collection started from ${loadedConfig.configPath}`,
    },
  });

  try {
    const now = new Date();
    const windowDays = loadedConfig.windowDays;
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const providerResults: ProviderCollectionResult[] = [];
    providerResults.push(await collectFromFileProvider(loadedConfig));
    providerResults.push(await collectFromXProvider(loadedConfig, windowStart));
    providerResults.push(await collectFromFacebookProvider(loadedConfig, windowStart));
    providerResults.push(await collectFromNeighborhoodProvider(loadedConfig, windowStart));
    providerResults.push(await collectFromNextdoorProvider(loadedConfig));

    const rawMentions = providerResults.flatMap((result) => result.mentions);
    const mentions = dedupeMentionsByJurisdictionAndUrl(rawMentions);

    let insertedOrUpdated = 0;

    for (const mentionInput of mentions) {
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { slug: mentionInput.jurisdictionSlug },
        select: { id: true },
      });
      if (!jurisdiction) continue;

      let postText = mentionInput.postText?.trim() ?? "";
      if (!postText) {
        const fetchedText = await fetchPostTextFromUrl(mentionInput.postUrl);
        postText = fetchedText?.trim() ?? "";
      }
      if (!postText) continue;

      const analyzed = analyzeSentiment(postText);
      await prisma.socialMention.upsert({
        where: {
          jurisdictionId_postUrl: {
            jurisdictionId: jurisdiction.id,
            postUrl: mentionInput.postUrl,
          },
        },
        create: {
          jurisdictionId: jurisdiction.id,
          platform: mentionInput.platform,
          sourceType: mentionInput.sourceType ?? "PUBLIC_MENTION",
          authorHandle: mentionInput.authorHandle ?? null,
          postUrl: mentionInput.postUrl,
          postText,
          postedAt: new Date(mentionInput.postedAt),
          sentimentScore: analyzed.score,
          sentimentLabel: analyzed.label,
          confidence: analyzed.confidence,
          collectedAt: now,
        },
        update: {
          platform: mentionInput.platform,
          sourceType: mentionInput.sourceType ?? "PUBLIC_MENTION",
          authorHandle: mentionInput.authorHandle ?? null,
          postText,
          postedAt: new Date(mentionInput.postedAt),
          sentimentScore: analyzed.score,
          sentimentLabel: analyzed.label,
          confidence: analyzed.confidence,
          collectedAt: now,
        },
      });
      insertedOrUpdated += 1;
    }

    const jurisdictions = await prisma.jurisdiction.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    for (const jurisdiction of jurisdictions) {
      await updateSentimentMetricsForJurisdiction(jurisdiction, windowStart, now);
    }

    const providerSummary = providerResults
      .map((result) =>
        result.note
          ? `${result.providerId}:${result.mentions.length} (${result.note})`
          : `${result.providerId}:${result.mentions.length}`
      )
      .join("; ");

    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        notes: `Processed ${insertedOrUpdated} mentions (${mentions.length} deduped). Providers => ${providerSummary}`,
      },
    });

    console.log(
      `[collect:sentiment] Processed ${insertedOrUpdated} mentions (${mentions.length} deduped). Providers => ${providerSummary}`
    );
  } catch (error) {
    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        notes: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
