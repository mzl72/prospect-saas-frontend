import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipoNegocio, localizacao, quantidade, nivelServico } = body;

    // Gerar ID único para tracking
    const campaignId = `campaign_${Date.now()}`;
    const timestamp = new Date().toLocaleString("pt-BR");

    const n8nWebhookUrl = "https://n8n.fflow.site/webhook/interface";

    // Payload melhorado
    const payload = {
      campaignId: campaignId,
      termos: tipoNegocio.join(","),
      locais: localizacao.join(","),
      quantidade: quantidade,
      nivelServico: nivelServico, // "basico" ou "completo"
      consolidado: nivelServico === "completo" ? "true" : "false",
      timestamp: timestamp,
      titulo: `${tipoNegocio.join(", ")} em ${localizacao.join(", ")}`,
    };

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: payload }),
    });

    // Resposta imediata (sem aguardar N8N terminar)
    return NextResponse.json({
      success: true,
      campaignId: campaignId,
      message: "Campanha iniciada com sucesso!",
      data: {
        status: "processing",
        titulo: payload.titulo,
        timestamp: timestamp,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Erro ao iniciar campanha",
      },
      { status: 500 }
    );
  }
}
