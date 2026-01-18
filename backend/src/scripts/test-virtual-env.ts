import { VirtualEnv } from '../virtual-env/manager.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function test() {
    const prId = 'test-run-' + Date.now();
    const env = new VirtualEnv(prId);

    try {
        console.log('--- 1. Initialize ---');
        const workDir = await env.initialize();
        console.log(`Workspace: ${workDir}`);

        console.log('--- 2. Clone Repo ---');

        await env.cloneRepo('https://github.com/axie22/Turtl.Bio', 'main');

        console.log('--- 3. Install Deps ---');
        await env.installDependencies();

        console.log('--- 4. Start Server ---');

        const url = await env.startServer('npm run build', 'npm start', 4000); 
        
        console.log(`Success! Server verified at ${url}`);
        
        console.log('\nServer is now running at http://localhost:4000');
        console.log('Waiting 5 minutes before cleanup... (Press Ctrl+C to stop earlier)');
        
        await new Promise(resolve => setTimeout(resolve, 300000));

    } catch (e: any) {
        console.error('Test Failed:', e.message);
        console.error(e);
    } finally {
        console.log('--- 5. Cleanup ---');
        env.cleanup(true); // true = delete workspace
    }
}

test();
