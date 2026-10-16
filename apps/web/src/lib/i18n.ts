import enMessages from '../../messages/en.json';

export type MessageKey = keyof typeof enMessages;

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let message = enMessages[key] || (key as string);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return message;
}
