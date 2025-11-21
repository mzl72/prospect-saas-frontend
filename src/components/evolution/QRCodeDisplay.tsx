"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, CheckCircle, XCircle } from 'lucide-react';
import { useEvolutionEvents } from '@/lib/socket-client';
import QRCode from 'react-qr-code';

interface QRCodeDisplayProps {
  instanceName: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function QRCodeDisplay({
  instanceName,
  onConnected,
  onDisconnected,
}: QRCodeDisplayProps) {
  const { qrCode, status, phoneNumber } = useEvolutionEvents(instanceName);
  const [lastQrCode, setLastQrCode] = useState<string | null>(null);

  // Memoriza último QR Code válido
  useEffect(() => {
    if (qrCode) {
      setLastQrCode(qrCode);
    }
  }, [qrCode]);

  // Callbacks de conexão/desconexão
  useEffect(() => {
    if (status === 'open' && onConnected) {
      onConnected();
    } else if (status === 'close' && onDisconnected) {
      onDisconnected();
    }
  }, [status, onConnected, onDisconnected]);

  const getStatusBadge = () => {
    switch (status) {
      case 'connecting':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      case 'open':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'close':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {instanceName}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Open (Conectado) */}
        {status === 'open' && phoneNumber && (
          <div className="text-center space-y-4">
            <div className="p-8 bg-green-50 rounded-lg border-2 border-green-200">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-900">Conectado com sucesso!</p>
              <p className="text-sm text-green-700 mt-2">
                Número: <span className="font-mono font-bold">{phoneNumber}</span>
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Esta instância está pronta para enviar mensagens WhatsApp
            </p>
          </div>
        )}

        {/* Status Connecting (Aguardando QR Code) */}
        {status === 'connecting' && !qrCode && !lastQrCode && (
          <div className="text-center space-y-4">
            <div className="p-8 bg-blue-50 rounded-lg border-2 border-blue-200">
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-semibold text-blue-900">Gerando QR Code...</p>
              <p className="text-sm text-blue-700 mt-2">Aguarde alguns segundos</p>
            </div>
          </div>
        )}

        {/* QR Code Disponível */}
        {(qrCode || lastQrCode) && status !== 'open' && (
          <div className="text-center space-y-4">
            <div className="p-6 bg-white rounded-lg border-2 border-blue-300 inline-block">
              <QRCode
                value={qrCode || lastQrCode || ''}
                size={256}
                level="M"
                className="mx-auto"
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                📱 Como escanear o QR Code:
              </p>
              <ol className="text-xs text-blue-800 space-y-1 text-left">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em <strong>Mais opções</strong> (3 pontos) → <strong>Aparelhos conectados</strong></li>
                <li>3. Toque em <strong>Conectar um aparelho</strong></li>
                <li>4. Aponte a câmera para este QR Code</li>
              </ol>
            </div>

            {status === 'connecting' && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando leitura do QR Code...</span>
              </div>
            )}
          </div>
        )}

        {/* Status Close (Desconectado) */}
        {status === 'close' && !qrCode && !lastQrCode && (
          <div className="text-center space-y-4">
            <div className="p-8 bg-gray-50 rounded-lg border-2 border-gray-200">
              <XCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900">Instância desconectada</p>
              <p className="text-sm text-gray-700 mt-2">
                Clique em &quot;Conectar&quot; para gerar um novo QR Code
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
