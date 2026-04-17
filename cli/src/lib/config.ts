export interface CliConfig {
  apiUrl: string;
  databaseUrl?: string;
}

const DEFAULT_API_URL = 'https://queryviz-2.onrender.com';

export function loadConfig(overrides: Partial<CliConfig> = {}): CliConfig {
  return {
    apiUrl: overrides.apiUrl ?? process.env.QUERYVIZ_API_URL ?? DEFAULT_API_URL,
    databaseUrl: overrides.databaseUrl ?? process.env.DATABASE_URL,
  };
}
