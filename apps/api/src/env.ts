export interface AppEnv {
  port: number;
  corsOrigins: string[] | true;
  githubToken: string | undefined;
  groqApiKey: string | undefined;
  groqModel: string | undefined;
  aiProvider: string | undefined;
}

export function readEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsedPort = Number(source.PORT ?? 3001);
  const corsOrigin = source.CORS_ORIGIN;
  const origins = corsOrigin
    ? corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

  return {
    port:
      Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3001,
    corsOrigins: origins.length > 0 ? origins : true,
    githubToken: source.GITHUB_TOKEN || undefined,
    groqApiKey: source.GROQ_API_KEY || undefined,
    groqModel: source.GROQ_MODEL || undefined,
    aiProvider: source.AI_PROVIDER || undefined,
  };
}
