#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SentimentMentionInput = {
  jurisdictionSlug: string;
  platform: string;
  sourceType?: "OFFICIAL_PAGE" | "PUBLIC_MENTION";
  authorHandle?: string | null;
  postUrl: string;
  postText?: string;
  postedAt: string;
};

type SentimentInputFile = {
  windowDays?: number;
  mentions?: SentimentMentionInput[];
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

async function fetchPostTextFromUrl(postUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    if (postUrl.includes("reddit.com")) {
      const redditJsonUrl = postUrl.includes(".json")
        ? postUrl
        : `${postUrl.replace(/\/$/, "")}.json`;
      const redditResponse = await fetch(redditJsonUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "autonomy-home-sentiment-bot/1.0" },
      });
      if (redditResponse.ok) {
        const payload = await redditResponse.json();
        const postData = payload?.[0]?.data?.children?.[0]?.data;
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
      extractorId: "social-sentiment-v1",
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

  if (!scoreMetricDef || !countMetricDef) {
    return;
  }

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
    const locatorText = `${mention.sentimentLabel.toLowerCase()} mention on ${mention.postedAt.toISOString().slice(0, 10)}`;

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
  const inputPath =
    process.argv[2] ?? path.join(process.cwd(), "data", "social-sentiment.json");

  const run = await prisma.collectionRun.create({
    data: {
      status: "RUNNING",
      trigger: "manual",
      source: "collect:sentiment",
      notes: `Sentiment collection started from ${inputPath}`,
    },
  });

  try {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Sentiment input file not found: ${inputPath}`);
    }

    const payload = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as SentimentInputFile;
    const now = new Date();
    const windowDays = payload.windowDays ?? 90;
    const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const mentions = payload.mentions ?? [];

    let insertedOrUpdated = 0;
    const touchedJurisdictionIds = new Set<string>();

    for (const mentionInput of mentions) {
      const jurisdiction = await prisma.jurisdiction.findUnique({
        where: { slug: mentionInput.jurisdictionSlug },
        select: { id: true },
      });
      if (!jurisdiction) {
        continue;
      }

      let postText = mentionInput.postText?.trim() ?? "";
      if (!postText) {
        const fetchedText = await fetchPostTextFromUrl(mentionInput.postUrl);
        postText = fetchedText?.trim() ?? "";
      }
      if (!postText) {
        continue;
      }

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
      touchedJurisdictionIds.add(jurisdiction.id);
    }

    const jurisdictions = await prisma.jurisdiction.findMany({
      where: touchedJurisdictionIds.size
        ? { id: { in: Array.from(touchedJurisdictionIds) } }
        : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    for (const jurisdiction of jurisdictions) {
      await updateSentimentMetricsForJurisdiction(jurisdiction, windowStart, now);
    }

    await prisma.collectionRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        notes: `Processed ${insertedOrUpdated} social mentions across ${jurisdictions.length} jurisdiction(s).`,
      },
    });

    console.log(
      `[collect:sentiment] Processed ${insertedOrUpdated} social mentions across ${jurisdictions.length} jurisdiction(s).`
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
