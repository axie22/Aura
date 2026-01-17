import { octokit } from '../github/client.js';

export async function analyzeDiff(owner: string, repo: string, pullNumber: number) {
    console.log(`Analyzing diff for ${owner}/${repo} PR #${pullNumber}`);

    try {
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
            return;
        }

        console.log(`Found ${uiFiles.length} UI files changed.`);

        for (const file of uiFiles) {
            console.log(`- ${file.filename}`);
            // In Phase 2, we will feed file.patch to the LLM
        }
        
    } catch (error) {
        console.error('Error fetching pull request files:', error);
    }
}
