interface Lead {
  nomeEmpresa: string;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  totalReviews: string | null;
  notaMedia: string | null;
  linkGoogleMaps: string | null;
  status: string;
  extractedAt: string | null;
  enrichedAt: string | null;
}

export function exportLeadsToCSV(leads: Lead[], campaignTitle: string) {
  // Definir headers do CSV
  const headers = [
    "Nome da Empresa",
    "Website",
    "Telefone",
    "Endereço",
    "Categoria",
    "Nota Média",
    "Total de Reviews",
    "Link Google Maps",
    "Status",
    "Data de Extração",
    "Data de Enriquecimento",
  ];

  // Converter leads para linhas CSV
  const rows = leads.map((lead) => {
    return [
      lead.nomeEmpresa,
      lead.website || "",
      lead.telefone || "",
      lead.endereco || "",
      lead.categoria || "",
      lead.notaMedia || "",
      lead.totalReviews || "",
      lead.linkGoogleMaps || "",
      lead.status,
      lead.extractedAt ? new Date(lead.extractedAt).toLocaleString("pt-BR") : "",
      lead.enrichedAt ? new Date(lead.enrichedAt).toLocaleString("pt-BR") : "",
    ];
  });

  // Montar CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Criar blob e fazer download
  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${campaignTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
