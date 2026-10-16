/**
 * Configuração do servidor a partir de variáveis de ambiente.
 * Nenhum segredo é versionado (ver constituição §14).
 */
export interface ServerConfig {
  port: number;
  clientOrigin: string;
  nodeEnv: string;
}

export function loadConfig(): ServerConfig {
  const port = Number(process.env.PORT ?? 3001);
  const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  return { port, clientOrigin, nodeEnv };
}
