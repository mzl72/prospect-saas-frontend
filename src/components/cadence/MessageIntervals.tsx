"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Calendar, Info } from "lucide-react";
import {
  type MessageInterval,
  getChannelColors,
  formatInterval
} from "./cadence-utils";

// Re-export para compatibilidade
export type { MessageInterval };

interface MessageIntervalsProps {
  intervals: MessageInterval[];
  onChange: (intervals: MessageInterval[]) => void;
  messageType: "email" | "whatsapp";
  showMessage3?: boolean; // Controla se exibe a mensagem 3
}

export function MessageIntervals({
  intervals,
  onChange,
  messageType,
  showMessage3 = true
}: MessageIntervalsProps) {
  const Icon = messageType === "email" ? Mail : MessageCircle;
  const colorClasses = getChannelColors(messageType);

  const handleIntervalChange = (messageNumber: 1 | 2 | 3, days: number) => {
    const updated = intervals.map((interval) =>
      interval.messageNumber === messageNumber
        ? { ...interval, daysAfterPrevious: Math.max(1, days) }
        : interval
    );
    onChange(updated);
  };

  const getInterval = (messageNumber: 1 | 2 | 3): number => {
    const interval = intervals.find((i) => i.messageNumber === messageNumber);
    return interval?.daysAfterPrevious ?? (messageNumber === 1 ? 1 : 2);
  };

  const getTotalDays = (messageNumber: 1 | 2 | 3): number => {
    let total = 1; // Começa no dia 1 (dia seguinte à extração)
    for (let i = 2; i <= messageNumber; i++) {
      total += getInterval(i as 1 | 2 | 3);
    }
    return total;
  };

  const messagesToShow = showMessage3 ? [1, 2, 3] : [1, 2];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`p-2 ${colorClasses.bg} rounded-lg`}>
          <Calendar className={`w-5 h-5 ${colorClasses.icon}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            Intervalo entre Mensagens
          </h3>
          <p className="text-sm text-gray-400">
            Defina quantos dias esperar entre cada envio
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Mensagem 1:</strong> Escolha quantos dias após a extração enviar</li>
              <li><strong>Mensagem 2:</strong> Escolha quantos dias após a mensagem 1</li>
              {showMessage3 && <li><strong>Mensagem 3:</strong> Escolha quantos dias após a mensagem 2</li>}
              <li className="text-blue-800">✨ Flexibilidade total para criar sua cadência!</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {messagesToShow.map((msgNum) => {
          const messageNumber = msgNum as 1 | 2 | 3;
          const isFirstMessage = messageNumber === 1;
          const interval = getInterval(messageNumber);
          const totalDays = getTotalDays(messageNumber);

          return (
            <Card key={messageNumber} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon & Label */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Message Label */}
                    <div>
                      <h4 className="font-semibold text-white">
                        Mensagem {messageNumber}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Será enviada no Dia {totalDays}
                      </p>
                    </div>

                    {/* Interval Input (agora mostrar para TODAS as mensagens) */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {isFirstMessage
                          ? "Dias após a extração"
                          : `Dias após a mensagem ${messageNumber - 1}`
                        }
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          value={interval}
                          onChange={(e) =>
                            handleIntervalChange(
                              messageNumber,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-gray-400">
                          {formatInterval(interval)}
                        </span>
                      </div>
                      {isFirstMessage && (
                        <p className="text-xs text-gray-400 italic">
                          💡 Exemplo: Extração na sexta → Dia 1 = sábado, Dia 3 = segunda
                        </p>
                      )}
                    </div>

                    {/* Timeline indicator */}
                    {!isFirstMessage && (
                      <div className="text-xs text-gray-500 bg-gray-100 rounded p-2">
                        💡 Total: <strong className="text-gray-300">Dia {totalDays}</strong> desde a extração
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">
          📊 Resumo da Cadência
        </h4>
        <div className="space-y-1 text-sm text-gray-400">
          <div className="flex justify-between">
            <span>Mensagem 1:</span>
            <span className="font-medium text-white">
              Dia {getTotalDays(1)} ({getInterval(1)} {getInterval(1) === 1 ? 'dia' : 'dias'} após extração)
            </span>
          </div>
          {messagesToShow.slice(1).map((msgNum) => {
            const messageNumber = msgNum as 2 | 3;
            const totalDays = getTotalDays(messageNumber);
            return (
              <div key={messageNumber} className="flex justify-between">
                <span>Mensagem {messageNumber}:</span>
                <span className="font-medium text-white">
                  Dia {totalDays} ({getInterval(messageNumber)} {getInterval(messageNumber) === 1 ? 'dia' : 'dias'} após msg {messageNumber - 1})
                </span>
              </div>
            );
          })}
          <div className="pt-2 mt-2 border-t border-gray-600 flex justify-between font-semibold">
            <span>Duração total da campanha:</span>
            <span className={colorClasses.text}>
              {getTotalDays(showMessage3 ? 3 : 2)} {getTotalDays(showMessage3 ? 3 : 2) === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
