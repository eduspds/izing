const queueByWhatsAppId: Map<number, Promise<any>> = new Map();

export function enqueueSend<T>(whatsappId: number, task: () => Promise<T>): Promise<T> {
  const previous = queueByWhatsAppId.get(whatsappId) || Promise.resolve();
  const next = previous
    .catch(() => undefined) // não bloquear a fila por falha anterior
    .then(task);
  queueByWhatsAppId.set(whatsappId, next.then(() => undefined, () => undefined));
  return next;
}

export function clearQueue(whatsappId: number): void {
  queueByWhatsAppId.delete(whatsappId);
}
