import { Request } from 'express';
import { analyzeDiff } from '../diff/analyzer.js';

export async function handleWebhook(req: Request) {
    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    if (event === 'pull_request') {
        const action = payload.action;
        if (action === 'opened' || action === 'synchronize') {
            const pullRequest = payload.pull_request;
            const number = pullRequest.number;
            const repository = payload.repository;
            const owner = repository.owner.login;
            const repo = repository.name;

            console.log(`Processing PR #${number} in ${owner}/${repo}: ${action}`);
            
            await analyzeDiff(owner, repo, number);
        } else {
            console.log(`Ignoring pull_request action: ${action}`);
        }
    } else {
        console.log(`Ignoring event: ${event}`);
    }
}
