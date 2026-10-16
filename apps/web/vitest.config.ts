import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testes de UI/E2E chegam nas Etapas 4–5; não falhar por ausência agora.
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
