import { Request } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { analyzeDiff } from '../diff/analyzer.js';
import { PlaywrightRunner } from '../playwright-runner.js';
import { WalkthroughScript, buildScriptBody } from '../agent/venv-playwright-runner.js';
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

async function uploadVideoToS3(localPath: string, keyPrefix: string): Promise<string | undefined> {
    if (!s3Region || !s3Bucket) {
        console.error('S3 upload skipped: AWS_REGION or S3_BUCKET is not configured');
        return;
    }

    if (!fs.existsSync(localPath)) {
        console.error('Video file does not exist at path:', localPath);
        return;
    }

    const key = `${keyPrefix}/${path.basename(localPath)}`;
    const client = getS3Client();
    const fileStream = fs.createReadStream(localPath);

    await client.send(new PutObjectCommand({
        Bucket: s3Bucket,
        Key: key,
        Body: fileStream,
        ContentType: 'video/webm',
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
                env.cleanup(true); // Kill process & delete dir
                return;
            }

            console.log(`[PR #${number}] UI Changes found. Waiting for VirtualEnv...`);

            // Wait for Environment
            try {
                const localUrl = await envPromise;
                console.log(`[PR #${number}] Ready for Agent! App running at ${localUrl}`);

                if (!analysisResult.planJson) {
                    console.warn(`[PR #${number}] No planJson from analyzer. Skipping Playwright run.`);
                    env.cleanup(true);
                    return;
                }

                let walkthroughScript: WalkthroughScript;
                try {
                    walkthroughScript = JSON.parse(analysisResult.planJson) as WalkthroughScript;
                } catch (e) {
                    console.error(`[PR #${number}] Failed to parse planJson as WalkthroughScript.`, e);
                    env.cleanup(true);
                    return;
                }

                const hasGoto = walkthroughScript.steps.some(step => step.action === 'goto');
                const route = hasGoto ? '' : (walkthroughScript.entryUrl || '');
                const scriptBody = buildScriptBody(walkthroughScript);

                const runner = new PlaywrightRunner();
                const result = await runner.run({
                    baseUrl: localUrl,
                    route,
                    scriptBody,
                    postScriptWaitMs: 1000,
                });

                console.log(`[PR #${number}] Playwright run result:`, result);

                if (result.videoPath) {
                    try {
                        const prefix = `playwright-videos/${prId}`;
                        const url = await uploadVideoToS3(result.videoPath, prefix);
                        if (url) {
                            console.log(`[PR #${number}] Uploaded Playwright video to S3: ${url}`);
                            try {
                              const commentBody = `### <img src="https://ui-avatars.com/api/?name=Aura+Bot&background=0D8ABC&color=fff&rounded=true&bold=true" width="35" /> Walkthrough Video\n\nHere is the recording of the generated plan:\n\n${url}`;
                              await postPullRequestComment(installationId, owner, repo, number, commentBody);
                              console.log(`[PR #${number}] Posted video comment.`);
                            } catch (e: any) {
                              console.error(`[PR #${number}] Failed to post video comment:`, e.message);
                            }
                        }
                    } catch (uploadError: any) {
                        console.error(`[PR #${number}] Failed to upload Playwright video to S3:`, uploadError?.message || uploadError);
                    }
                }

                env.cleanup(true);
            } catch (e: any) {
                console.error(`[PR #${number}] Aborting due to environment failure:`, e);
                if (e.stack) console.error(e.stack);
                env.cleanup(true);
            }
        } else {
            console.log(`Ignoring pull_request action: ${action}`);
        }
    } else {
        console.log(`Ignoring event: ${event}`);
    }
}
