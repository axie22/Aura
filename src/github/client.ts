import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

let privateKey: string;

function getPrivateKey(): string {
  if (privateKey) return privateKey;

  if (process.env.PRIVATE_KEY) {
    privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');
    return privateKey;
  }
  if (process.env.PRIVATE_KEY_PATH) {
    privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
    return privateKey;
  }

  throw new Error('Missing PRIVATE_KEY or PRIVATE_KEY_PATH environment variable');
}

export function getInstallationOctokit(installationId: number): Octokit {
  const appId = process.env.APP_ID;
  if (!appId) throw new Error('Missing APP_ID environment variable');

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: appId,
      privateKey: getPrivateKey(),
      installationId: installationId,
    },
  });
}
