import { VirtualEnv } from '../virtual-env/manager.js';
import { PlaywrightRunner } from '../playwright-runner.js';

export interface WalkthroughScript {
    name: string;
    entryUrl: string;
    scriptBody: string;
    highlightSelectors?: string[];
}

export interface VenvRunOptions {
    prId: string;
    repoUrl: string;
    branch: string;
    script: WalkthroughScript;
    port?: number;
}

export interface VenvRunResult {
    baseUrl: string;
    success: boolean;
    videoPath?: string;
    error?: string;
}

export function buildScriptBody(script: WalkthroughScript, baseUrl?: string): string {
    const lines: string[] = [];
    lines.push("await page.waitForLoadState('domcontentloaded');");
    // Soft wait for network idle
    lines.push("try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch (e) {}");

    if (script.highlightSelectors && script.highlightSelectors.length > 0) {
        const selectorsJson = JSON.stringify(script.highlightSelectors);
        const browserLogic = `(selectors) => {
            const runHighlight = () => {
                selectors.forEach(sel => {
                    try {
                        const elements = document.querySelectorAll(sel);
                        elements.forEach(el => {
                            if (el instanceof HTMLElement) {
                                el.style.outline = '0.2em solid red';
                                el.setAttribute('data-aura-highlighted', 'true');
                            }
                        });
                    } catch (e) {}
                });
            };

            runHighlight();

            const observer = new MutationObserver(() => {
                runHighlight();
            });

            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    runHighlight();
                    if (document.body) {
                        observer.observe(document.body, { childList: true, subtree: true });
                    }
                });
            }
        }`;

        lines.push(`await page.addInitScript(${browserLogic}, ${selectorsJson});`);
        lines.push(`await page.evaluate(${browserLogic}, ${selectorsJson});`);
    }

    // Append the raw script body from the LLM
    // We assume the LLM generates valid Playwright code that uses 'page'
    lines.push("// --- Generated Script Body ---");
    lines.push(script.scriptBody);

    return lines.join('\n');
}

export async function runInVirtualEnv(options: VenvRunOptions): Promise<VenvRunResult> {
    const env = new VirtualEnv(options.prId);
    const runner = new PlaywrightRunner();
    const port = options.port ?? 4000;

    try {
        await env.initialize();
        await env.cloneRepo(options.repoUrl, options.branch);
        await env.installDependencies();
        const baseUrl = await env.startServer('npm run build', 'npm start', port);

        const hasGoto = options.script.scriptBody.includes('page.goto(');
        const route = hasGoto ? '' : options.script.entryUrl || '';
        const scriptBody = buildScriptBody(options.script, baseUrl);

        const result = await runner.run({
            baseUrl,
            route,
            scriptBody,
        });

        return {
            baseUrl,
            success: result.success,
            videoPath: result.videoPath,
            error: result.error,
        };
    } finally {
        env.cleanup(true);
    }
}
