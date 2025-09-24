import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params; // ← Adicionar await aqui

    // Simulação de status baseado em tempo (temporário)
    const mockStatus = {
      campaignId,
      status: "processando" as const,
      message: "Processamento em andamento...",
      progress: 75,
      planilhaUrl: null,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockStatus);
  } catch {
    return NextResponse.json(
      {
        error: "Campaign not found",
      },
      { status: 404 }
    );
  }
}
