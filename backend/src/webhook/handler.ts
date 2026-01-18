import { Request } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { analyzeDiff } from '../diff/analyzer.js';
import { PlaywrightRunner } from '../playwright-runner.js';
import { WalkthroughScript, buildScriptBody } from '../agent/venv-playwright-runner.js';
import { convertToMp4, generateGif } from '../utils/video.js';
import { postPullRequestComment } from '../github/client.js';

const s3Region = process.env.AWS_REGION;
const s3Bucket = process.env.S3_BUCKET;

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
    if (!s3Region || !s3Bucket) {
        throw new Error('Missing AWS_REGION or S3_BUCKET environment variables for S3 uploads');
    }

    if (!s3Client) {
        s3Client = new S3Client({ region: s3Region });
    }
    return s3Client;
}

async function uploadFileToS3(localPath: string, keyPrefix: string): Promise<string | undefined> {
    if (!s3Region || !s3Bucket) {
        console.error('S3 upload skipped: AWS_REGION or S3_BUCKET is not configured');
        return;
    }

    if (!fs.existsSync(localPath)) {
        console.error('File does not exist at path:', localPath);
        return;
    }

    const key = `${keyPrefix}/${path.basename(localPath)}`;
    const client = getS3Client();
    const fileStream = fs.createReadStream(localPath);

    let contentType = 'application/octet-stream';
    if (localPath.endsWith('.webm')) contentType = 'video/webm';
    else if (localPath.endsWith('.mp4')) contentType = 'video/mp4';
    else if (localPath.endsWith('.gif')) contentType = 'image/gif';

    await client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
        ACL: 'public-read',
    }));

    return `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`;
}

export async function handleWebhook(req: Request) {
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    if (event === 'pull_request') {
        const action = payload.action;
        if (action === 'opened' || action === 'synchronize') {
            const pullRequest = payload.pull_request;
            const number = pullRequest.number;
            const repository = payload.repository;
            const owner = repository.owner.login;
            const repo = repository.name;

            const installationId = payload.installation?.id;

            if (!installationId) {
                console.error('No installation ID found in webhook payload');
                return;
            }

            const cloneUrl = repository.clone_url;
            const branch = pullRequest.head.ref;
            const prId = `${owner}-${repo}-pr-${number}`;

            // 1. Start Analysis & VirtualEnv concurrently
            const { VirtualEnv } = await import('../virtual-env/manager.js');
            const env = new VirtualEnv(prId);

            console.log(`[PR #${number}] Starting Diff Analysis & Virtual Environment Setup...`);

            const analysisPromise = analyzeDiff(installationId, owner, repo, number);

            const envPromise = (async () => {
                try {
                    console.log(`[PR #${number}] Initializing VirtualEnv...`);
                    await env.initialize();
                    await env.cloneRepo(cloneUrl, branch);
                    await env.installDependencies();
                    return await env.startServer('npm run build', 'npm start', 4000);
                } catch (e: any) {
                    console.error(`[PR #${number}] VirtualEnv setup failed:`, e.message);
                    throw e;
                }
            })();

            // Wait for Analysis first
            const analysisResult = await analysisPromise;

            if (!analysisResult || !analysisResult.uiFiles || analysisResult.uiFiles.length === 0) {
                console.log(`[PR #${number}] No relevant UI changes. Cancelling VirtualEnv...`);
                await env.cleanup(true); // Kill process & delete dir
                return;
            }

            console.log(`[PR #${number}] UI Changes found. Waiting for VirtualEnv...`);

            // Wait for Environment
            try {
                const localUrl = await envPromise;
                console.log(`[PR #${number}] Ready for Agent! App running at ${localUrl}`);

                if (!analysisResult.planJson) {
                    console.warn(`[PR #${number}] No planJson from analyzer. Skipping Playwright run.`);
                    await env.cleanup(true);
                    return;
                }

                let walkthroughScript: WalkthroughScript;
                try {
                    walkthroughScript = JSON.parse(analysisResult.planJson) as WalkthroughScript;
                } catch (e) {
                    console.error(`[PR #${number}] Failed to parse planJson as WalkthroughScript.`, e);
                    await env.cleanup(true);
                    return;
                }

                // ... (skipping unchanged parts)

                await env.cleanup(true);
            } catch (e: any) {
                console.error(`[PR #${number}] Aborting due to environment failure:`, e);
                if (e.stack) console.error(e.stack);
                await env.cleanup(true);
            }
        } else {
            console.log(`Ignoring pull_request action: ${action}`);
        }
    } else {
        console.log(`Ignoring event: ${event}`);
    }
}
