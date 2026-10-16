import type { Identity } from '../store/game.js';

/**
 * Persistência leve da identidade de sessão para reconexão (sessionStorage).
 * O token não é segredo de longo prazo, mas não deve ser exposto a terceiros.
 */
const KEY = 'coup:identity';

export function saveIdentity(id: Identity): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    // ambiente sem storage: ignora (reconexão não ficará disponível)
  }
}

export function loadIdentity(): Identity | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignora
  }
}
