import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A engine (Etapa 2) adicionará testes; até lá, não falhar por ausência.
    passWithNoTests: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
});
