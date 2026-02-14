PRAGMA foreign_keys=OFF;

-- Create collection run table.
CREATE TABLE IF NOT EXISTS "CollectionRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "trigger" TEXT,
  "source" TEXT,
  "notes" TEXT,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" DATETIME,
  "jurisdictionId" TEXT,
  CONSTRAINT "CollectionRun_jurisdictionId_fkey"
    FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Expand Jurisdiction with level + hierarchy.
CREATE TABLE "new_Jurisdiction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'MUNICIPALITY',
  "parentId" TEXT,
  "county" TEXT,
  "state" TEXT NOT NULL DEFAULT 'MI',
  "website" TEXT,
  "phone" TEXT,
  "buildingDeptLink" TEXT,
  "healthDeptLink" TEXT,
  "address" TEXT,
  "officeHours" TEXT,
  "notes" TEXT,
  "lastVerified" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Jurisdiction_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Jurisdiction" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Jurisdiction" (
  "id", "name", "slug", "type", "county", "state", "website", "phone",
  "buildingDeptLink", "healthDeptLink", "address", "officeHours", "notes",
  "lastVerified", "createdAt", "updatedAt"
)
SELECT
  "id", "name", "slug", "type", "county", "state", "website", "phone",
  "buildingDeptLink", "healthDeptLink", "address", "officeHours", "notes",
  "lastVerified", "createdAt", "updatedAt"
FROM "Jurisdiction";
DROP TABLE "Jurisdiction";
ALTER TABLE "new_Jurisdiction" RENAME TO "Jurisdiction";
CREATE UNIQUE INDEX "Jurisdiction_slug_key" ON "Jurisdiction"("slug");
CREATE INDEX "Jurisdiction_level_idx" ON "Jurisdiction"("level");
CREATE INDEX "Jurisdiction_parentId_idx" ON "Jurisdiction"("parentId");
CREATE INDEX "Jurisdiction_type_idx" ON "Jurisdiction"("type");

-- Add level applicability to MetricDef.
ALTER TABLE "MetricDef" ADD COLUMN "appliesMunicipality" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MetricDef" ADD COLUMN "appliesCounty" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MetricDef" ADD COLUMN "appliesState" BOOLEAN NOT NULL DEFAULT true;

-- Add source reliability metadata.
ALTER TABLE "Source" ADD COLUMN "reliability" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Source" ADD COLUMN "contentType" TEXT;
ALTER TABLE "Source" ADD COLUMN "extractorId" TEXT;

-- Add source document reliability metadata.
ALTER TABLE "SourceDoc" ADD COLUMN "reliability" TEXT NOT NULL DEFAULT 'OTHER';
ALTER TABLE "SourceDoc" ADD COLUMN "extractorId" TEXT;

-- Rebuild MetricValue for new status + run linkage and uniqueness.
CREATE TABLE "new_MetricValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jurisdictionId" TEXT NOT NULL,
  "metricDefId" TEXT NOT NULL,
  "collectionRunId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "valueNumeric" REAL,
  "valueText" TEXT,
  "windowStart" DATETIME,
  "windowEnd" DATETIME,
  "lastVerified" DATETIME,
  "collectedAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "confidence" REAL,
  "notes" TEXT,
  CONSTRAINT "MetricValue_jurisdictionId_fkey"
    FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetricValue_metricDefId_fkey"
    FOREIGN KEY ("metricDefId") REFERENCES "MetricDef" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MetricValue_collectionRunId_fkey"
    FOREIGN KEY ("collectionRunId") REFERENCES "CollectionRun" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MetricValue" (
  "id", "jurisdictionId", "metricDefId", "valueNumeric", "valueText",
  "windowStart", "windowEnd", "lastVerified", "confidence", "notes"
)
SELECT
  "id", "jurisdictionId", "metricDefId", "valueNumeric", "valueText",
  "windowStart", "windowEnd", "lastVerified", "confidence", "notes"
FROM "MetricValue";
DROP TABLE "MetricValue";
ALTER TABLE "new_MetricValue" RENAME TO "MetricValue";
CREATE UNIQUE INDEX "MetricValue_jurisdictionId_metricDefId_key"
  ON "MetricValue"("jurisdictionId", "metricDefId");
CREATE INDEX "MetricValue_status_idx" ON "MetricValue"("status");
CREATE INDEX "MetricValue_lastVerified_idx" ON "MetricValue"("lastVerified");

-- Citation indexing + dedupe key.
CREATE INDEX IF NOT EXISTS "Citation_metricValueId_idx" ON "Citation"("metricValueId");
CREATE INDEX IF NOT EXISTS "Citation_sourceId_idx" ON "Citation"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "Citation_metricValueId_sourceId_locatorText_key"
  ON "Citation"("metricValueId", "sourceId", "locatorText");

CREATE INDEX IF NOT EXISTS "CollectionRun_status_idx" ON "CollectionRun"("status");
CREATE INDEX IF NOT EXISTS "CollectionRun_startedAt_idx" ON "CollectionRun"("startedAt");

PRAGMA foreign_keys=ON;
