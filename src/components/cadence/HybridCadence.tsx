"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail, MessageCircle, Calendar, Info } from "lucide-react";
import {
  type HybridCadenceItem,
  getChannelColors,
  getHybridItemLabel,
  formatInterval
} from "./cadence-utils";

// Re-export para compatibilidade
export type { HybridCadenceItem };

interface HybridCadenceProps {
  items: HybridCadenceItem[];
  onChange: (items: HybridCadenceItem[]) => void;
}

export function HybridCadence({ items, onChange }: HybridCadenceProps) {
  const handleIntervalChange = (messageNumber: number, days: number) => {
    const updated = items.map((item) =>
      item.messageNumber === messageNumber
        ? { ...item, daysAfterPrevious: Math.max(1, days) }
        : item
    );
    onChange(updated);
  };

  const getInterval = (messageNumber: number): number => {
    const item = items.find((i) => i.messageNumber === messageNumber);
    return item?.daysAfterPrevious || 1;
  };

  const getTotalDays = (messageNumber: number): number => {
    let total = 0;
    for (let i = 1; i <= messageNumber; i++) {
      total += getInterval(i);
    }
    return total;
  };

  const getIcon = (type: "email" | "whatsapp") => {
    return type === "email" ? Mail : MessageCircle;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Calendar className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">
            Cadência Híbrida (Email + WhatsApp)
          </h3>
          <p className="text-sm text-gray-400">
            Alterne entre emails e WhatsApp com intervalos personalizados
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-purple-700">
            <p className="font-medium mb-1">Sequência Híbrida:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>5 envios totais:</strong> 3 emails + 2 WhatsApp intercalados</li>
              <li><strong>Default:</strong> Email → WhatsApp → Email → WhatsApp → Email (1 dia entre cada)</li>
              <li><strong>Personalizável:</strong> Ajuste o intervalo de cada envio individualmente</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {items.map((item) => {
          const isFirst = item.messageNumber === 1;
          const interval = getInterval(item.messageNumber);
          const totalDays = getTotalDays(item.messageNumber);
          const Icon = getIcon(item.type);
          const colorClasses = getChannelColors(item.type);

          return (
            <Card key={item.messageNumber} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon & Label */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-lg ${colorClasses.bg} flex items-center justify-center relative`}>
                      <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {item.messageNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Message Label */}
                    <div>
                      <h4 className="font-semibold text-white">
                        {getHybridItemLabel(item)}
                      </h4>
                      <p className="text-sm text-gray-400">
                        Será enviada no Dia {totalDays}
                      </p>
                    </div>

                    {/* Interval Input */}
                    <div className="space-y-2">
                      <Label className="text-sm">
                        {isFirst
                          ? "Dias após a extração"
                          : `Dias após o envio ${item.messageNumber - 1}`
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
                              item.messageNumber,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24"
                        />
                        <span className="text-sm text-gray-400">
                          {formatInterval(interval)}
                        </span>
                      </div>
                      {isFirst && (
                        <p className="text-xs text-gray-400 italic">
                          💡 Primeiro contato com o lead
                        </p>
                      )}
                    </div>

                    {/* Timeline indicator */}
                    {!isFirst && (
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
          📊 Resumo da Cadência Híbrida
        </h4>
        <div className="space-y-1 text-sm text-gray-400">
          {items.map((item, index) => {
            const totalDays = getTotalDays(item.messageNumber);
            const interval = getInterval(item.messageNumber);
            const Icon = getIcon(item.type);
            const colors = getChannelColors(item.type);
            return (
              <div key={item.messageNumber} className="flex justify-between">
                <span className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colors.icon}`} />
                  {getHybridItemLabel(item)}:
                </span>
                <span className="font-medium text-white">
                  Dia {totalDays}
                  {index === 0
                    ? ` (${interval} ${interval === 1 ? 'dia' : 'dias'} após extração)`
                    : ` (${interval} ${interval === 1 ? 'dia' : 'dias'} após envio ${item.messageNumber - 1})`
                  }
                </span>
              </div>
            );
          })}
          <div className="pt-2 mt-2 border-t border-gray-600 flex justify-between font-semibold">
            <span>Duração total da campanha:</span>
            <span className="text-purple-600">
              {getTotalDays(items.length)} {getTotalDays(items.length) === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
