import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function verifyAppAuth() {
    const appId = process.env.APP_ID;
    let privateKey = process.env.PRIVATE_KEY;

    if (!appId) {
        console.error('❌ Missing APP_ID in .env');
        process.exit(1);
    }

    if (!privateKey && process.env.PRIVATE_KEY_PATH) {
        try {
            privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
        } catch (e: any) {
            console.error(`❌ Failed to read private key from ${process.env.PRIVATE_KEY_PATH}: ${e.message}`);
            process.exit(1);
        }
    }

    if (!privateKey) {
        console.error('❌ Missing PRIVATE_KEY or PRIVATE_KEY_PATH in .env');
        process.exit(1);
    }

    // Fix newline issues in private key if loaded from env var
    if (!process.env.PRIVATE_KEY_PATH) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
        console.log(`Attempting to authenticate as App ID: ${appId}...`);
        
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: appId,
                privateKey: privateKey,
            },
        });

        // Get the authenticated app's details
        // This validates the JWT generation (Private Key + App ID) works
        const { data: app } = await octokit.rest.apps.getAuthenticated();

        console.log(`✅ Authentication Successful!`);
        console.log(`   App Name: ${app?.name}`);
        console.log(`   App URL: ${app?.html_url}`);
        
        // Handling possibly different response shapes for owner
        const ownerLogin = (app?.owner as any)?.login || 'Unknown';
        console.log(`   Owner: ${ownerLogin}`);
        
    } catch (error: any) {
        console.error('❌ Authentication Failed:', error.message);
        if (error.status === 401) {
            console.error('   Hint: Check your APP_ID and PRIVATE_KEY.');
        }
    }
}

verifyAppAuth();
