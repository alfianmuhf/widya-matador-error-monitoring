-- AlterTable telegram_users
ALTER TABLE "telegram_users" ALTER COLUMN "telegram_id" DROP NOT NULL;

-- AlterTable users: Tambah telegram_user_id
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_user_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_user_id_key" ON "users"("telegram_user_id");

-- AddForeignKey users -> telegram_users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_telegram_user_id_fkey'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_telegram_user_id_fkey" FOREIGN KEY ("telegram_user_id") REFERENCES "telegram_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable tickets: Tambah aftersales_user_id
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "aftersales_user_id" UUID;

-- CreateIndex tickets
CREATE INDEX IF NOT EXISTS "tickets_aftersales_user_id_idx" ON "tickets"("aftersales_user_id");

-- AddForeignKey tickets -> users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tickets_aftersales_user_id_fkey'
    ) THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_aftersales_user_id_fkey" FOREIGN KEY ("aftersales_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
