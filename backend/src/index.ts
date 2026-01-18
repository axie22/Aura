import express from 'express';
import dotenv from 'dotenv';
import { handleWebhook } from './webhook/handler.js';
import { verifySignature } from './webhook/verify.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

const webhookHandler = async (req: any, res: any) => {
    try {
        await verifySignature(req);
        await handleWebhook(req);
        res.status(200).send('Webhook processed');
    } catch (error: any) {
        console.error('Webhook processing failed:', error.message);
        res.status(error.status || 500).send(error.message);
    }
};

app.post('/webhooks', webhookHandler);
// Handle case where Load Balancer strips the prefix
app.post('/', webhookHandler);

app.get('/', (req, res) => {
    res.send('Aura Bot is running');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
