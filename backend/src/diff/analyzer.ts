import { getInstallationOctokit, postPullRequestComment } from '../github/client.js';
import { generatePlaywrightPlan } from '../llm/gemini.js';

// Helper: Fetch repo context via GitHub API
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
        // Limit to top 30 files to avoid rate limits
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

export async function analyzeDiff(installationId: number, owner: string, repo: string, pullNumber: number): Promise<any[] | null> {
    console.log(`Analyzing diff for ${owner}/${repo} PR #${pullNumber} (Installation ID: ${installationId})`);

    try {
        const octokit = getInstallationOctokit(installationId);

        // Get PR details to find the head branch (so we fetch context from the feature branch, or we could use base 'main')
        // Using 'main' (base) is usually safer for context, but using head gives the full picture.
        // Let's use the PR's head ref for the most up-to-date context.
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

        // 3. Define System Prompt
        const systemPrompt = `
            You are a Senior Frontend QA Engineer writing Playwright walkthrough plans.

            Goal: produce a SHORT, reliable UI walkthrough plan based on a PR diff and the repository context.

            Output ONLY valid JSON matching this interface:

            interface WalkthroughScript {
            name: string;
            entryUrl: string;
            steps: {
                description: string;
                action: 'goto' | 'click' | 'fill' | 'assertText' | 'wait';
                target?: string; // selector or url
                value?: string; // value to fill or assert
            }[];
            }

            Example Output:
            {
            "name": "Verify Login Flow",
            "entryUrl": "/login",
            "steps": [
                { "description": "Navigate to login", "action": "goto", "target": "/login" },
                { "description": "Fill email", "action": "fill", "target": "input[name='email']", "value": "test@example.com" },
                { "description": "Click submit", "action": "click", "target": "button[type='submit']" },
                { "description": "Verify dashboard", "action": "assertText", "target": "h1", "value": "Dashboard" }
            ]
            }

            - Prefer stable selectors: getByRole(), getByLabel(), and data-testid if available.
            - Focus ONLY on flows likely impacted by the changed files.
            `;

        // 4. Call LLM
        console.log("Generating Playwright plan...");
        const planJsonString = await generatePlaywrightPlan(aggregatedDiff, repoContext, systemPrompt);

        let planVariableName = "generatedWalkthrough";
        try {
            const planObj = JSON.parse(planJsonString);
            if (planObj.name) {
                // Convert "Verify Login Flow" -> "verifyLoginFlow"
                planVariableName = planObj.name
                    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word: string, index: number) =>
                        index === 0 ? word.toLowerCase() : word.toUpperCase())
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

        try {
            const commentBody = `### Aura Generated Playwright Plan\n\n\`\`\`typescript\n${tsOutput}\n\`\`\``;
            await postPullRequestComment(installationId, owner, repo, pullNumber, commentBody);
            console.log(`[Analyzer] Posted comment to PR #${pullNumber}`);
        } catch (error: any) {
            console.error(`[Analyzer] Failed to post comment: ${error.message}`);
        }

        console.log("---------------------------------------------------");

        console.log(`[Analyzer] Analysis complete. Returning ${uiFiles.length} UI files.`);

        // TODO: In Phase 3, we will save this plan or trigger the runner.


        return uiFiles;

    } catch (error: any) {
        console.error('Error fetching pull request files:', error.message);
        return null;
    }
}
