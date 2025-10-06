-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('PROCESSING', 'EXTRACTION_COMPLETED', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CampaignType" AS ENUM ('BASICO', 'COMPLETO');

-- CreateEnum
CREATE TYPE "public"."LeadStatus" AS ENUM ('EXTRACTED', 'ENRICHED', 'EMAIL_1_SENT', 'EMAIL_2_SENT', 'EMAIL_3_SENT', 'WHATSAPP_1_SENT', 'WHATSAPP_2_SENT', 'WHATSAPP_3_SENT', 'REPLIED', 'OPTED_OUT', 'BOUNCED');

-- CreateEnum
CREATE TYPE "public"."EmailStatus" AS ENUM ('PENDING', 'SENT', 'OPENED', 'REPLIED', 'BOUNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."WhatsAppStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'REPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."CadenceType" AS ENUM ('EMAIL_ONLY', 'WHATSAPP_ONLY', 'HYBRID');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 150,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_pesquisa" TEXT NOT NULL DEFAULT '',
    "template_analise_empresa" TEXT NOT NULL DEFAULT '',
    "informacoes_propria" TEXT NOT NULL DEFAULT '',
    "prompt_overview" TEXT NOT NULL DEFAULT '',
    "prompt_tatica" TEXT NOT NULL DEFAULT '',
    "prompt_diretrizes" TEXT NOT NULL DEFAULT '',
    "email_titulo_1" TEXT NOT NULL DEFAULT '',
    "email_corpo_1" TEXT NOT NULL DEFAULT '',
    "email_corpo_2" TEXT NOT NULL DEFAULT '',
    "email_titulo_3" TEXT NOT NULL DEFAULT '',
    "email_corpo_3" TEXT NOT NULL DEFAULT '',
    "nome_empresa" TEXT NOT NULL DEFAULT '',
    "assinatura" TEXT NOT NULL DEFAULT '',
    "telefone_contato" TEXT NOT NULL DEFAULT '',
    "website_empresa" TEXT NOT NULL DEFAULT '',
    "sender_emails" TEXT NOT NULL DEFAULT '[]',
    "whatsapp_message_1" TEXT NOT NULL DEFAULT '',
    "whatsapp_message_2" TEXT NOT NULL DEFAULT '',
    "whatsapp_message_3" TEXT NOT NULL DEFAULT '',
    "evolution_instances" TEXT NOT NULL DEFAULT '[]',
    "email_intervals" TEXT NOT NULL DEFAULT '[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]',
    "whatsapp_intervals" TEXT NOT NULL DEFAULT '[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]',
    "hybrid_intervals" TEXT NOT NULL DEFAULT '[{"type":"email","messageNumber":1,"emailNumber":1,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":4,"whatsappNumber":2,"daysAfterPrevious":1},{"type":"email","messageNumber":5,"emailNumber":3,"daysAfterPrevious":1}]',
    "email_2_delay_days" INTEGER NOT NULL DEFAULT 3,
    "email_3_delay_days" INTEGER NOT NULL DEFAULT 7,
    "daily_email_limit" INTEGER NOT NULL DEFAULT 100,
    "email_business_hour_start" INTEGER NOT NULL DEFAULT 9,
    "email_business_hour_end" INTEGER NOT NULL DEFAULT 18,
    "whatsapp_daily_limit" INTEGER NOT NULL DEFAULT 50,
    "whatsapp_business_hour_start" INTEGER NOT NULL DEFAULT 9,
    "whatsapp_business_hour_end" INTEGER NOT NULL DEFAULT 18,
    "hybrid_daily_limit" INTEGER NOT NULL DEFAULT 70,
    "hybrid_business_hour_start" INTEGER NOT NULL DEFAULT 9,
    "hybrid_business_hour_end" INTEGER NOT NULL DEFAULT 18,
    "send_only_business_hours" BOOLEAN NOT NULL DEFAULT true,
    "use_hybrid_cadence" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."channel_send_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "last_sent_at" TIMESTAMP(3) NOT NULL,
    "next_allowed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'PROCESSING',
    "quantidade" INTEGER NOT NULL,
    "tipo" "public"."CampaignType" NOT NULL,
    "termos" TEXT NOT NULL,
    "locais" TEXT NOT NULL,
    "planilha_url" TEXT,
    "process_started_at" TIMESTAMP(3),
    "estimated_completion_time" INTEGER,
    "timeout_at" TIMESTAMP(3),
    "credits_cost" INTEGER,
    "leads_requested" INTEGER,
    "leads_created" INTEGER NOT NULL DEFAULT 0,
    "leads_duplicated" INTEGER NOT NULL DEFAULT 0,
    "credits_refunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "nome_empresa" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "website" TEXT,
    "telefone" TEXT,
    "categoria" TEXT,
    "total_reviews" TEXT,
    "nota_media" TEXT,
    "link_google_maps" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "youtube_url" TEXT,
    "tiktok_url" TEXT,
    "pinterest_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apify_lead_id" TEXT,
    "extracted_at" TIMESTAMP(3),
    "enriched_at" TIMESTAMP(3),
    "status" "public"."LeadStatus" NOT NULL DEFAULT 'EXTRACTED',
    "cadence_type" "public"."CadenceType",
    "company_research" TEXT,
    "strategic_analysis" TEXT,
    "personalization" TEXT,
    "analysis_link" TEXT,
    "assigned_sender" TEXT,
    "opt_out_token" TEXT,
    "opted_out_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emails" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sender_account" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "message_id" TEXT,
    "thread_id" TEXT,
    "status" "public"."EmailStatus" NOT NULL DEFAULT 'PENDING',
    "opened_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."whatsapp_messages" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "phone_number" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "public"."WhatsAppStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "message_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "public"."user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_send_logs_user_id_channel_key" ON "public"."channel_send_logs"("user_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "leads_apify_lead_id_key" ON "public"."leads"("apify_lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "leads_opt_out_token_key" ON "public"."leads"("opt_out_token");

-- CreateIndex
CREATE INDEX "leads_campaign_id_status_idx" ON "public"."leads"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "emails_message_id_key" ON "public"."emails"("message_id");

-- CreateIndex
CREATE INDEX "emails_lead_id_sequence_number_idx" ON "public"."emails"("lead_id", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_message_id_key" ON "public"."whatsapp_messages"("message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_lead_id_sequence_number_idx" ON "public"."whatsapp_messages"("lead_id", "sequence_number");

-- AddForeignKey
ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emails" ADD CONSTRAINT "emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
