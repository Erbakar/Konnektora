-- CreateTable
CREATE TABLE "content_polls" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "allow_multiple" BOOLEAN NOT NULL DEFAULT false,
    "max_choices" INTEGER NOT NULL DEFAULT 1,
    "allow_open_answer" BOOLEAN NOT NULL DEFAULT false,
    "audience" TEXT NOT NULL DEFAULT 'everyone',
    "closes_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_poll_options" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_open_answer" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_poll_votes" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "content_polls_comment_id_key" ON "content_polls"("comment_id");

-- CreateIndex
CREATE INDEX "content_poll_options_poll_id_sort_order_idx" ON "content_poll_options"("poll_id", "sort_order");

-- CreateIndex
CREATE INDEX "content_poll_votes_poll_id_user_id_idx" ON "content_poll_votes"("poll_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_poll_votes_poll_id_option_id_user_id_key" ON "content_poll_votes"("poll_id", "option_id", "user_id");

-- AddForeignKey
ALTER TABLE "content_polls" ADD CONSTRAINT "content_polls_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "content_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_poll_options" ADD CONSTRAINT "content_poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "content_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_poll_votes" ADD CONSTRAINT "content_poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "content_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_poll_votes" ADD CONSTRAINT "content_poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "content_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

