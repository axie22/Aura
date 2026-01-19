import { getInstallationOctokit } from '../github/client.js';
import { generatePlaywrightPlan, generatePRSummary } from '../llm/gemini.js';

export interface AnalyzeDiffResult {
    uiFiles: any[];
    planJson: string;
    summary: string;
}

async function fetchRepoContext(octokit: any, owner: string, repo: string, branch: string = 'main'): Promise<string> {
    console.log(`[Analyzer] fetchRepoContext called for ${owner}/${repo} on branch ${branch}`);
    try {
        // Get the tree recursively
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: branch,
            recursive: 'true'
        });
        console.log(`[Analyzer] Tree fetched. Total items: ${treeData.tree.length}`);

        // Filter for relevant files (tsx, ts, css) and ignore node_modules/dist
        const relevantFiles = treeData.tree
            .filter((file: any) =>
                file.type === 'blob' &&
                (file.path.endsWith('.tsx') || file.path.endsWith('.ts') || file.path.endsWith('.css')) &&
                !file.path.includes('node_modules') &&
                !file.path.includes('dist') &&
                !file.path.includes('test')
            )
            .slice(0, 30);

        console.log(`Fetching content for ${relevantFiles.length} context files...`);

        let context = "";
        for (const file of relevantFiles) {
            try {
                const { data: fileData } = await octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: file.path,
                    ref: branch
                });

                if ('content' in fileData && fileData.encoding === 'base64') {
                    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
                    context += `\n--- File: ${file.path} ---\n${content}\n`;
                }
            } catch (err) {
                console.warn(`Failed to fetch content for ${file.path}`);
            }
        }
        console.log(`[Analyzer] Context construction complete. Total length: ${context.length}`);
        return context;

    } catch (error) {
        console.error("Error fetching repo context:", error);
        return "Unable to fetch repository context.";
    }
}

export async function analyzeDiff(installationId: number, owner: string, repo: string, pullNumber: number): Promise<AnalyzeDiffResult | null> {
    console.log(`Analyzing diff for ${owner}/${repo} PR #${pullNumber} (Installation ID: ${installationId})`);

    try {
        const octokit = getInstallationOctokit(installationId);

        // Get PR details to find the head branch
        const { data: prData } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber
        });
        const branch = prData.head.ref; // The feature branch
        console.log(`[Analyzer] PR Head Branch: ${branch}`);

        const { data: files } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: pullNumber,
        });

        const uiExtensions = ['.tsx', '.jsx', '.html', '.css'];
        const uiFiles = files.filter((file: any) => {
            return uiExtensions.some(ext => file.filename.endsWith(ext));
        });

        if (uiFiles.length === 0) {
            console.log('No UI files changed. Exiting.');
            return null;
        }

        console.log(`Found ${uiFiles.length} UI files changed.`);

        // 1. Aggregate Patches
        let aggregatedDiff = "";
        for (const file of uiFiles) {
            console.log(`- ${file.filename}`);
            if (file.patch) {
                aggregatedDiff += `\n--- ${file.filename} ---\n${file.patch}\n`;
            }
        }

        // 2. Get Repo Context (Remote)
        console.log(`Fetching remote repo context from branch: ${branch}`);
        const repoContext = await fetchRepoContext(octokit, owner, repo, branch);

        const systemPrompt = `
            You are a Senior Frontend QA Engineer writing Playwright walkthrough scripts.

            Goal: produce a reliable UI walkthrough script based on a PR diff and the repository context.
            This is a VISUAL DEMO.

            Output ONLY valid JSON matching this interface:

            interface WalkthroughScript {
              name: string;
              entryUrl: string;
              scriptBody: string; // The CONTENT of an async function (do not wrap in 'async function() { ... }')
              highlightSelectors?: string[]; // VISUAL highlights only. MUST be valid CSS selectors.
            }

            Example Output:
            {
              "name": "Verify Login Flow",
              "entryUrl": "/login",
              "scriptBody": "await page.getByLabel('Email').fill('test@example.com');\\nawait page.getByRole('button', { name: 'Submit' }).click();\\nawait page.waitForURL('**/dashboard');",
              "highlightSelectors": [
                "button[type='submit']",
                "input[name='email']"
              ]
            }

            Guidelines:
            - scriptBody: Write efficient Playwright TypeScript code.
              - Use 'page' object directly.
              - PREFER locator methods like page.getByRole(), page.getByText() for INTERACTION.
              - You MAY use await page.locator(...).waitFor() or await page.waitForURL(...) for flow control. DO NOT use expect(...) assertions.
            - highlightSelectors:
              - MUST BE valid CSS selectors (e.g. '.btn', '#submit', '[data-testid="foo"]').
              - DO NOT use Playwright locators like 'getByRole' here. The highlighting script uses document.querySelectorAll().
              - Select 1-5 elements most relevant to the changes.
            `;

        // 4. Call LLM
        console.log("Generating Playwright plan and summary...");
        const [planJsonString, summary] = await Promise.all([
            generatePlaywrightPlan(aggregatedDiff, repoContext, systemPrompt),
            generatePRSummary(aggregatedDiff, repoContext)
        ]);

        let planVariableName = "generatedWalkthrough";
        try {
            const planObj = JSON.parse(planJsonString);
            if (planObj.name) {
                // Convert "Verify Login Flow" -> "verifyLoginFlow"
                planVariableName = planObj.name
                    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) => {
                        return index === 0 ? word.toLowerCase() : word.toUpperCase();
                    })
                    .replace(/\s+/g, '')
                    .replace(/[^a-zA-Z0-9]/g, '');
            }
        } catch (e) {
            console.warn("Could not parse JSON to generate variable name, using default.");
        }

        const tsOutput = `export const ${planVariableName} = ${planJsonString};`;

        console.log("---------------------------------------------------");
        console.log("GENERATED PLAN (TypeScript):");
        console.log(tsOutput);
        console.log("---------------------------------------------------");

        // Comment posting moved to handler.ts to combine with video

        console.log(`[Analyzer] Analysis complete. Returning ${uiFiles.length} UI files and plan JSON.`);

        return {
            uiFiles,
            planJson: planJsonString,
            summary
        };

    } catch (error: any) {
        console.error('Error fetching pull request files:', error.message);
        return null;
    }
}
