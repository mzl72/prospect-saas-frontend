// src/app/api/cron/check-campaign-timeout/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cron job que verifica campanhas em processamento que ultrapassaram o timeout
 * e as marca como FAILED, devolvendo os créditos ao usuário
 */
export async function GET() {
  try {
    console.log("[Cron Check Timeout] Iniciando verificação de campanhas com timeout...");

    // Buscar campanhas em PROCESSING que ultrapassaram o timeout
    const now = new Date();
    const timedOutCampaigns = await prisma.campaign.findMany({
      where: {
        status: "PROCESSING",
        timeoutAt: {
          lte: now, // timeout já passou
        },
      },
      select: {
        id: true,
        title: true,
        userId: true,
        creditsCost: true,
        quantidade: true,
        tipo: true,
        processStartedAt: true,
        timeoutAt: true,
      },
    });

    if (timedOutCampaigns.length === 0) {
      console.log("[Cron Check Timeout] ✅ Nenhuma campanha com timeout encontrada");
      return NextResponse.json({
        success: true,
        message: "Nenhuma campanha com timeout",
        processedCount: 0,
      });
    }

    console.log(`[Cron Check Timeout] ⚠️ ${timedOutCampaigns.length} campanhas com timeout encontradas`);

    // Processar cada campanha com timeout
    const results = await Promise.allSettled(
      timedOutCampaigns.map(async (campaign) => {
        try {
          console.log(`[Cron Check Timeout] Processando campanha ${campaign.id} (${campaign.title})`);
          console.log(`  - Tipo: ${campaign.tipo}`);
          console.log(`  - Quantidade: ${campaign.quantidade}`);
          console.log(`  - Iniciada em: ${campaign.processStartedAt?.toISOString()}`);
          console.log(`  - Timeout em: ${campaign.timeoutAt?.toISOString()}`);
          console.log(`  - Custo: ${campaign.creditsCost} créditos`);

          // Executar em transação: marcar como FAILED + devolver créditos
          await prisma.$transaction(async (tx) => {
            // 1. Marcar campanha como FAILED
            await tx.campaign.update({
              where: { id: campaign.id },
              data: { status: "FAILED" },
            });

            // 2. Devolver créditos ao usuário (se creditsCost estiver definido)
            if (campaign.creditsCost && campaign.creditsCost > 0) {
              await tx.user.update({
                where: { id: campaign.userId },
                data: {
                  credits: {
                    increment: campaign.creditsCost,
                  },
                },
              });

              console.log(`  ✅ ${campaign.creditsCost} créditos devolvidos ao usuário ${campaign.userId}`);
            }
          });

          return {
            campaignId: campaign.id,
            title: campaign.title,
            refunded: campaign.creditsCost || 0,
            success: true,
          };
        } catch (error) {
          console.error(`[Cron Check Timeout] ❌ Erro ao processar campanha ${campaign.id}:`, error);
          return {
            campaignId: campaign.id,
            title: campaign.title,
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          };
        }
      })
    );

    // Contar sucessos e falhas
    const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    console.log(`[Cron Check Timeout] ✅ Processamento concluído:`);
    console.log(`  - ${successful} campanhas marcadas como FAILED com créditos devolvidos`);
    console.log(`  - ${failed} erros durante processamento`);

    return NextResponse.json({
      success: true,
      message: `${successful} campanhas processadas`,
      processedCount: successful,
      failedCount: failed,
      results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: r.reason })),
    });
  } catch (error) {
    console.error("[Cron Check Timeout] ❌ Erro crítico:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
