const requiredEnvVars = {
  public: [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID"
  ],
  server: [
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL"
  ]
};

export function validateEnv() {
  const missing: string[] = [];

  for (const key of requiredEnvVars.public) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of requiredEnvVars.server) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(key => `  - ${key}`).join("\n")}\n\nPlease check your .env file.`
    );
  }
}

export function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}