import { Request } from 'express';
import { analyzeDiff } from '../diff/analyzer.js';

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
            const uiFiles = await analysisPromise;

            if (!uiFiles || uiFiles.length === 0) {
                console.log(`[PR #${number}] No relevant UI changes. Cancelling VirtualEnv...`);
                env.cleanup(true); // Kill process & delete dir
                return;
            }

            console.log(`[PR #${number}] UI Changes found. Waiting for VirtualEnv...`);

            // Wait for Environment
            try {
                const localUrl = await envPromise;
                console.log(`[PR #${number}] Ready for Agent! App running at ${localUrl}`);
                
                // TODO: Trigger Phase 3 Agent
                
            } catch (e) {
                console.error(`[PR #${number}] Aborting due to environment failure.`);
                env.cleanup(true);
            }
        } else {
            console.log(`Ignoring pull_request action: ${action}`);
        }
    } else {
        console.log(`Ignoring event: ${event}`);
    }
}
