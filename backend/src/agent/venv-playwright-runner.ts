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
    lines.push("try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch (e) {}");

    if (script.highlightSelectors && script.highlightSelectors.length > 0) {
        const selectorsJson = JSON.stringify(script.highlightSelectors);
        lines.push(`const __auraHighlightSelectors = ${selectorsJson};`);
        lines.push(`async function __auraApplyHighlights(page) {`);
        lines.push(`  for (const sel of __auraHighlightSelectors) {`);
        lines.push(`    const locator = page.locator(sel);`);
        lines.push(`    const elements = await locator.elementHandles();`);
        lines.push(`    for (const el of elements) {`);
        lines.push(`      await el.evaluate(node => {`);
        lines.push(`        if (node instanceof HTMLElement) {`);
        lines.push(`          node.style.outline = '0.2em solid red';`);
        lines.push(`          node.setAttribute('data-aura-highlighted', 'true');`);
        lines.push(`        }`);
        lines.push(`      });`);
        lines.push(`    }`);
        lines.push(`  }`);
        lines.push(`}`);
        lines.push(`const __auraOriginalGoto = page.goto.bind(page);`);
        lines.push(`page.goto = async (...args) => {`);
        lines.push(`  const result = await __auraOriginalGoto(...args);`);
        lines.push(`  await __auraApplyHighlights(page);`);
        lines.push(`  return result;`);
        lines.push(`};`);
        lines.push(`await __auraApplyHighlights(page);`);
        // Generate CSS rules for all selectors
        // We use !important to ensure visibility over existing styles
        const cssRules = script.highlightSelectors.map(selector =>
            `${selector} { 
                outline: 2px solid red !important; 
                box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
                position: relative !important;
                z-index: 2147483647 !important;
            }`
        ).join('\n');

        const cssJson = JSON.stringify(cssRules);

        // 1. Inject into current page immediately
        lines.push(`await page.addStyleTag({ content: ${cssJson} });`);

        // 2. Persist across navigations
        lines.push(`await page.addInitScript((css) => {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }, ${cssJson});`);
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
