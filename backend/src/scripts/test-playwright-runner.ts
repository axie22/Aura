import { PlaywrightRunner } from '../playwright-runner.js';

async function main() {
    const runner = new PlaywrightRunner();

    const result = await runner.run({
        baseUrl: 'https://example.com',
        scriptBody: `
            const label: string = 'Example Domain';
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
        `,
    });

    console.log('Playwright run result:', result);
}

main().catch((error) => {
    console.error('Playwright test failed:', error);
    process.exit(1);
});
