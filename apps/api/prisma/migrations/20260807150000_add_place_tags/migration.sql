CREATE TABLE "place_tags" (
  "place_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  CONSTRAINT "place_tags_pkey" PRIMARY KEY ("place_id", "tag_id"),
  CONSTRAINT "place_tags_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "place_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "place_tags_tag_id_idx" ON "place_tags"("tag_id");
