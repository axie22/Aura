import { getInstallationOctokit } from '../github/client.js';

export async function analyzeDiff(installationId: number, owner: string, repo: string, pullNumber: number): Promise<any[] | null> {
    console.log(`Analyzing diff for ${owner}/${repo} PR #${pullNumber} (Installation ID: ${installationId})`);

    try {
        const octokit = getInstallationOctokit(installationId);
        
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

        for (const file of uiFiles) {
            console.log(`- ${file.filename}`);
        }
        
        return uiFiles;
        
    } catch (error: any) {
        console.error('Error fetching pull request files:', error.message);
        return null;
    }
}
