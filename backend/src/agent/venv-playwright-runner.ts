import { VirtualEnv } from '../virtual-env/manager.js';
import { PlaywrightRunner } from '../playwright-runner.js';

export type WalkthroughAction = 'goto' | 'click' | 'fill' | 'assertText' | 'wait';

export interface WalkthroughStep {
    description: string;
    action: WalkthroughAction;
    target?: string;
    value?: string;
}

export interface WalkthroughScript {
    name: string;
    entryUrl: string;
    steps: WalkthroughStep[];
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

export function buildScriptBody(script: WalkthroughScript): string {
    const lines: string[] = [];
    lines.push("await page.waitForLoadState('load');");

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
                    } catch (e) { }
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

    for (const step of script.steps) {
        if (step.action === 'goto' && step.target) {
            lines.push(`await page.goto(${JSON.stringify(step.target)}, { waitUntil: 'networkidle' });`);
        } else if (step.action === 'click' && step.target) {
            lines.push(`await page.click(${JSON.stringify(step.target)});`);
        } else if (step.action === 'fill' && step.target && step.value !== undefined) {
            lines.push(`await page.fill(${JSON.stringify(step.target)}, ${JSON.stringify(step.value)});`);
        } else if (step.action === 'wait') {
            const ms = parseInt(step.value || '1000', 10);
            const timeout = Number.isFinite(ms) ? ms : 1000;
            lines.push(`await page.waitForTimeout(${timeout});`);
        } else if (step.action === 'assertText' && step.target && step.value !== undefined) {
            const target = JSON.stringify(step.target);
            const expected = JSON.stringify(step.value);
            const desc = JSON.stringify(step.description);
            lines.push(
                `{` +
                `const locator = page.locator(${target});` +
                `await locator.waitFor();` +
                `const text = await locator.textContent();` +
                `if (!text || !text.includes(${expected})) {` +
                `throw new Error('Assertion failed for step: ' + ${desc});` +
                `}` +
                `}`
            );
        }
    }

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

        const hasGoto = options.script.steps.some(step => step.action === 'goto');
        const route = hasGoto ? '' : options.script.entryUrl || '';
        const scriptBody = buildScriptBody(options.script);

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
