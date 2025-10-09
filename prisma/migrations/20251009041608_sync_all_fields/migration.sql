/*
  Warnings:

  - You are about to drop the column `email_intervals` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `hybrid_intervals` on the `user_settings` table. All the data in the column will be lost.
  - You are about to drop the column `whatsapp_intervals` on the `user_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_settings" DROP COLUMN "email_intervals",
DROP COLUMN "hybrid_intervals",
DROP COLUMN "whatsapp_intervals",
ADD COLUMN     "email_only_cadence" TEXT NOT NULL DEFAULT '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"14:00-16:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]',
ADD COLUMN     "hybrid_cadence" TEXT NOT NULL DEFAULT '[{"type":"email","messageNumber":1,"emailNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"dayOfWeek":2,"timeWindow":"14:00-16:00","daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"dayOfWeek":4,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]',
ADD COLUMN     "whatsapp_only_cadence" TEXT NOT NULL DEFAULT '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"10:00-12:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"15:00-17:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"10:00-12:00","daysAfterPrevious":2}]';
