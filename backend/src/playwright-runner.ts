import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export interface PlaywrightJobSpec {
    baseUrl: string;
    route?: string;
    scriptBody: string;
    viewport?: {
        width: number;
        height: number;
    };
    videoDir?: string;
    postScriptWaitMs?: number;
}

export interface PlaywrightRunResult {
    success: boolean;
    error?: string;
    videoPath?: string;
}

export class PlaywrightRunner {
    async run(job: PlaywrightJobSpec): Promise<PlaywrightRunResult> {
        const browser: Browser = await chromium.launch({ headless: true });
        const videoDir = job.videoDir ?? path.resolve(process.cwd(), 'playwright-videos');

        if (!fs.existsSync(videoDir)) {
            fs.mkdirSync(videoDir, { recursive: true });
        }

        const context: BrowserContext = await browser.newContext({
            viewport: job.viewport ?? { width: 1280, height: 720 },
            recordVideo: {
                dir: videoDir,
                size: job.viewport ?? { width: 1280, height: 720 },
            },
        });

        const page: Page = await context.newPage();

        const normalizedBase = job.baseUrl.replace(/\/+$/, '');
        const normalizedRoute = job.route
            ? job.route.startsWith('/')
                ? job.route
                : `/${job.route}`
            : '';

        const targetUrl = `${normalizedBase}${normalizedRoute}`;

        let success = false;
        let errorMessage: string | undefined;
        let videoPath: string | undefined;
        const tailWait = job.postScriptWaitMs ?? 1000;
        const video = page.video();

        try {
            await page.goto(targetUrl, { waitUntil: 'networkidle' });

            const transpiled = ts.transpileModule(job.scriptBody, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2022,
                    module: ts.ModuleKind.CommonJS,
                },
            }).outputText;

            const asyncFn = new Function('page', `return (async () => { ${transpiled} })();`);

            await asyncFn(page);

            if (tailWait > 0) {
                await page.waitForTimeout(tailWait);
            }

            success = true;
        } catch (error: any) {
            errorMessage = error?.message ?? String(error);
            success = false;
        } finally {
            try {
                await context.close();
                if (video) {
                    videoPath = await video.path();
                }
            } finally {
                await browser.close();
            }
        }

        return {
            success,
            error: errorMessage,
            videoPath,
        };
    }
}
