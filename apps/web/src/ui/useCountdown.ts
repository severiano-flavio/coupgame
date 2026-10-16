import { useEffect, useState } from 'react';

/**
 * Conta regressiva sincronizada com o deadline absoluto do servidor. Atualiza
 * só a cada 250ms (não por frame) para não re-renderizar demais.
 */
export function useCountdown(deadline: number | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (deadline === null) {
      setRemaining(null);
      return;
    }
    const tick = (): void => {
      setRemaining(Math.max(0, deadline - Date.now()));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline]);

  return remaining;
}

export function formatSeconds(ms: number | null): string {
  if (ms === null) return '';
  return `${Math.ceil(ms / 1000)}s`;
}
