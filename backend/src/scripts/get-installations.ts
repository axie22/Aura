import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from 'octokit';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const appId = process.env.APP_ID;
const privateKeyPath = process.env.PRIVATE_KEY_PATH || 'backend/aura-private-key.pem';

async function main() {
    if (!appId) throw new Error('APP_ID not set');
    
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
        if (fs.existsSync(privateKeyPath)) {
            privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        } else {
             throw new Error('PRIVATE_KEY not set and pem file not found');
        }
    }

    const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: appId,
            privateKey: privateKey,
        },
    });

    try {
        const { data: installations } = await appOctokit.rest.apps.listInstallations();
        console.log('Installations:');
        installations.forEach(inst => {
            console.log(`- ID: ${inst.id}, Account: ${inst.account?.login}`);
        });
    } catch (e: any) {
        console.error('Failed to list installations:', e.message);
    }
}

main();
