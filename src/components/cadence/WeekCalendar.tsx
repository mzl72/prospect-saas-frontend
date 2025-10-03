"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Clock, GripVertical } from "lucide-react";

export interface CadenceItem {
  type: "email" | "whatsapp";
  messageNumber: 1 | 2 | 3;
  dayOfWeek: number; // 0-6 (0=Dom, 1=Seg, ...)
  timeWindow: string; // "09:00-11:00"
}

interface WeekCalendarProps {
  items: CadenceItem[];
  onChange: (items: CadenceItem[]) => void;
  mode: "email" | "whatsapp" | "hybrid";
}

const DAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

export function WeekCalendar({ items, onChange, mode }: WeekCalendarProps) {
  const [draggedItem, setDraggedItem] = useState<CadenceItem | null>(null);

  const handleDragStart = (item: CadenceItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (dayOfWeek: number) => {
    if (!draggedItem) return;

    const updatedItems = items.map((item) => {
      if (
        item.type === draggedItem.type &&
        item.messageNumber === draggedItem.messageNumber
      ) {
        return { ...item, dayOfWeek };
      }
      return item;
    });

    onChange(updatedItems);
    setDraggedItem(null);
  };

  const getItemsForDay = (day: number) => {
    return items.filter((item) => item.dayOfWeek === day);
  };

  const getItemLabel = (item: CadenceItem) => {
    const prefix = item.type === "email" ? "Email" : "WhatsApp";
    return `${prefix} ${item.messageNumber}`;
  };

  const getItemIcon = (item: CadenceItem) => {
    return item.type === "email" ? (
      <Mail className="w-4 h-4" />
    ) : (
      <MessageCircle className="w-4 h-4" />
    );
  };

  const getItemColor = (item: CadenceItem) => {
    return item.type === "email"
      ? "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200"
      : "bg-green-100 border-green-300 text-green-700 hover:bg-green-200";
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📅 Calendário de Cadência
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Arraste os cards para os dias desejados
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((day) => (
          <div key={day.value} className="flex flex-col">
            {/* Day Header */}
            <div className="mb-2 text-center">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {day.short}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500">
                {day.label}
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(day.value)}
              className="min-h-[200px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="space-y-2">
                {getItemsForDay(day.value).map((item, idx) => (
                  <div
                    key={`${item.type}-${item.messageNumber}`}
                    draggable
                    onDragStart={() => handleDragStart(item)}
                    className={`p-3 rounded-lg border-2 cursor-move shadow-sm transition-all ${getItemColor(
                      item
                    )}`}
                  >
                    {/* Grip Icon */}
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="w-3 h-3 text-gray-400" />
                      <div className="flex items-center gap-1.5 flex-1">
                        {getItemIcon(item)}
                        <span className="text-xs font-semibold">
                          {getItemLabel(item)}
                        </span>
                      </div>
                    </div>

                    {/* Time Window */}
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{item.timeWindow}</span>
                    </div>
                  </div>
                ))}

                {getItemsForDay(day.value).length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs">
                    Arraste aqui
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Email</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-green-600" />
          <span className="text-gray-600 dark:text-gray-400">WhatsApp</span>
        </div>
      </div>
    </div>
  );
}
