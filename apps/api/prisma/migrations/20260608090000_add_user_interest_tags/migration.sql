-- CreateTable
CREATE TABLE "user_interest_tags" (
    "user_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_interest_tags_pkey" PRIMARY KEY ("user_id","tag_id")
);

-- CreateIndex
CREATE INDEX "user_interest_tags_tag_id_idx" ON "user_interest_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "user_interest_tags" ADD CONSTRAINT "user_interest_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interest_tags" ADD CONSTRAINT "user_interest_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
