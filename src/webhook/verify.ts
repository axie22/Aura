import { Request } from 'express';
import { verify } from '@octokit/webhooks-methods';

export async function verifySignature(req: Request) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('WEBHOOK_SECRET is not defined');
    }

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
        const error = new Error('No signature found');
        (error as any).status = 401;
        throw error;
    }

    const body = (req as any).rawBody; 
    if (!body) {
         const error = new Error('Request body is empty');
         (error as any).status = 400;
         throw error;
    }

    const isValid = await verify(secret, body, signature);
    if (!isValid) {
        const error = new Error('Invalid signature');
        (error as any).status = 401;
        throw error;
    }
}
