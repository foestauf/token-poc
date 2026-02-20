import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

const DEFAULT_TOKEN_PATH = '/var/run/secrets/tokens/token';

export async function readProjectedToken(path?: string): Promise<string> {
  const tokenPath = path ?? DEFAULT_TOKEN_PATH;

  if (!existsSync(tokenPath)) {
    throw new Error(`Token file not found at ${tokenPath}`);
  }

  const token = await readFile(tokenPath, 'utf-8');
  return token.trim();
}
