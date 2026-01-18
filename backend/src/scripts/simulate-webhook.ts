import { sign } from '@octokit/webhooks-methods';
import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const SECRET = process.env.WEBHOOK_SECRET || "";

if (!SECRET) {
    console.error('Error: WEBHOOK_SECRET is not defined in .env');
    process.exit(1);
}

const payload = {
    action: 'synchronize',
    pull_request: {
        number: 9,
        title: 'Deployment Fixes w Docker',
        head: { 
            sha: 'a166237b8837540b1d1c3ff98106174ae89abb76', 
            ref: 'deplyoment'
        },
        base: { sha: '791d36b55c383cf930c4ef8f6977001ee636fd0b' },
    },
    repository: {
        name: 'Aura',
        owner: { login: 'axie22' },
        clone_url: 'https://github.com/axie22/Aura.git',
    },
    installation: {
        id: 104760035,
    },
};

const payloadString = JSON.stringify(payload);

async function sendWebhook() {
    console.log(`Signing payload with secret: ${SECRET.slice(0, 4)}...`);
    const signature = await sign(SECRET, payloadString);

    console.log(`Sending webhook to http://localhost:${PORT}/webhooks...`);

    try {
        const response = await fetch(`http://localhost:${PORT}/webhooks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hub-signature-256': signature,
                'x-github-event': 'pull_request',
            },
            body: payloadString,
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (response.ok) {
            console.log('Webhook delivered successfully!');
        } else {
            console.error('Webhook failed.');
        }
    } catch (error: any) {
        console.error('Connection failed:', error.message);
        console.log('Make sure the server is running with "npm run dev"');
    }
}

sendWebhook();
