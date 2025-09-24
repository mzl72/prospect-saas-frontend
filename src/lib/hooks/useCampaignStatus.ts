import { useState, useEffect, useRef, useCallback } from "react";

interface CampaignStatus {
  campaignId: string;
  status: "processando" | "concluido" | "erro";
  message: string;
  progress: number;
  planilhaUrl?: string;
  updatedAt: string;
}

export function useCampaignStatus(campaignId: string, enabled = true) {
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaign-status/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);

        // Parar polling se campanha concluída
        if (data.status === "concluido" || data.status === "erro") {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      }
      setLoading(false);
    } catch {
      setError("Erro ao consultar status");
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (!enabled || !campaignId) return;

    // Primeira consulta imediata
    fetchStatus();

    // Polling a cada 5 segundos
    intervalRef.current = setInterval(fetchStatus, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [campaignId, enabled, fetchStatus]);

  return { status, loading, error, refetch: fetchStatus };
}
