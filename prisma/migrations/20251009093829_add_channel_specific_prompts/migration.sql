/*
  Warnings:

  - You are about to drop the column `prompt_diretrizes` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `prompt_overview` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `prompt_tatica` on the `user_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_settings" DROP COLUMN "prompt_diretrizes",
DROP COLUMN "prompt_overview",
DROP COLUMN "prompt_tatica",
ADD COLUMN     "email_prompt_diretrizes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email_prompt_overview" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "email_prompt_tatica" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hybrid_prompt_diretrizes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hybrid_prompt_overview" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hybrid_prompt_tatica" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsapp_prompt_diretrizes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsapp_prompt_overview" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "whatsapp_prompt_tatica" TEXT NOT NULL DEFAULT '';
