-- CreateEnum
CREATE TYPE "attachment_status" AS ENUM ('pending', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "attachment_media_type" AS ENUM ('image', 'video');

-- AlterTable
ALTER TABLE "ticket_attachments" ADD COLUMN "file_type" "attachment_media_type" NOT NULL DEFAULT 'image',
ADD COLUMN "thumbnail_url" TEXT,
ADD COLUMN "status" "attachment_status" NOT NULL DEFAULT 'ready',
ADD COLUMN "duration" DOUBLE PRECISION,
ADD COLUMN "error_message" TEXT,
ALTER COLUMN "file_url" DROP NOT NULL,
ALTER COLUMN "file_size" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ticket_attachments_ticket_id_file_type_idx" ON "ticket_attachments"("ticket_id", "file_type");

