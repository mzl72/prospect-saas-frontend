/**
 * Extensão tipada de UserSettings para campos futuros/opcionais
 * Evita uso de `as any` no código
 */

import { UserSettings } from '@prisma/client';

export interface UserSettingsExtended extends UserSettings {
  // Email settings (opcionais até serem adicionados ao schema)
  emailBusinessHourStart?: number;
  emailBusinessHourEnd?: number;

  // WhatsApp settings (opcionais até serem adicionados ao schema)
  whatsappBusinessHourStart?: number;
  whatsappBusinessHourEnd?: number;
  whatsappDailyLimit?: number;
}
