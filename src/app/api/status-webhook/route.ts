import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { campaignId, status, message, progress, planilhaUrl } =
      await request.json();

    console.log("✅ Status update recebido:", {
      campaignId,
      status,
      message,
      progress,
      planilhaUrl,
    });

    // TODO: Na Fase 2, aqui atualizaremos o banco de dados
    // Por enquanto, só registramos no log

    return NextResponse.json({
      success: true,
      received: true,
      campaignId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro no webhook de status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Invalid payload",
      },
      { status: 400 }
    );
  }
}
