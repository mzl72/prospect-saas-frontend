-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_pesquisa" TEXT NOT NULL DEFAULT '',
    "template_analise_empresa" TEXT NOT NULL DEFAULT '',
    "email_titulo_1" TEXT NOT NULL DEFAULT '',
    "email_corpo_1" TEXT NOT NULL DEFAULT '',
    "email_titulo_2" TEXT NOT NULL DEFAULT '',
    "email_corpo_2" TEXT NOT NULL DEFAULT '',
    "email_titulo_3" TEXT NOT NULL DEFAULT '',
    "email_corpo_3" TEXT NOT NULL DEFAULT '',
    "informacoes_propria" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "public"."user_settings"("user_id");

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
