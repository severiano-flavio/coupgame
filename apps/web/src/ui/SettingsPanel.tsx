import type { JSX } from 'react';
import { useUiStore } from '../store/ui.js';

/**
 * Preferências de UI: ativar/desativar animações (o jogo permanece jogável sem
 * elas) e sensibilidade da câmera. Acessível por teclado.
 */
export function SettingsPanel(): JSX.Element {
  const animationsEnabled = useUiStore((s) => s.animationsEnabled);
  const setAnimationsEnabled = useUiStore((s) => s.setAnimationsEnabled);
  const sensitivity = useUiStore((s) => s.cameraSensitivity);
  const setSensitivity = useUiStore((s) => s.setCameraSensitivity);

  return (
    <div className="w-56 rounded-lg bg-black/50 p-3 text-sm text-amber-100 ring-1 ring-black/40">
      <p className="mb-2 font-semibold text-amber-300">Preferências</p>
      <label className="mb-2 flex items-center justify-between gap-2">
        <span>Animações</span>
        <input
          type="checkbox"
          checked={animationsEnabled}
          onChange={(e) => setAnimationsEnabled(e.target.checked)}
          className="h-4 w-4 accent-amber-500"
        />
      </label>
      <label className="block">
        <span className="mb-1 block">Sensibilidade da câmera</span>
        <input
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-full accent-amber-500"
        />
      </label>
    </div>
  );
}
