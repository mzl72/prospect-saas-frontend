export interface Campaign {
  id: string;
  titulo: string;
  quantidade: number;
  tipo: "basico" | "completo";
  status: "processando" | "concluido" | "erro";
  criadoEm: string;
  planilhaUrl?: string;
}
