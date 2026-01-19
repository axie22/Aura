import dotenv from 'dotenv';
import { runInVirtualEnv, WalkthroughScript } from '../agent/venv-playwright-runner.js';

dotenv.config();

async function main() {
    const script: WalkthroughScript = {
        name: 'Dummy Wait Script',
        entryUrl: '/',
        scriptBody: `
            await page.waitForTimeout(2000);
        `
    };

    const prId = 'venv-playwright-test-' + Date.now();

    const result = await runInVirtualEnv({
        prId,
        repoUrl: 'https://github.com/axie22/Turtl.Bio',
        branch: 'main',
        script,
        port: 4000,
    });

    console.log('VirtualEnv Playwright result:', result);
}

main().catch((error) => {
    console.error('VirtualEnv Playwright test failed:', error);
    process.exit(1);
});

