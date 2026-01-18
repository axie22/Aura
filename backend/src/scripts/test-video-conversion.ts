import fs from 'fs';
import path from 'path';
import https from 'https';
import { convertToMp4, generateGif } from '../utils/video.js';

const VIDEO_URL = 'https://aura-s3-bucket-map.s3.us-east-2.amazonaws.com/playwright-videos/axie22-TestRepo-pr-27/9e0a8d850ae4c55e875d9481199bfd5d.webm';
const TEMP_DIR = path.resolve(process.cwd(), 'temp_test_video');
const INPUT_FILE = path.join(TEMP_DIR, 'test_video.webm');

async function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response: any) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err: any) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function runTest() {
    console.log('Starting video conversion test...');
    
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR);
    }

    try {
        console.log(`Downloading test video from ${VIDEO_URL}...`);
        await downloadFile(VIDEO_URL, INPUT_FILE);
        console.log(`Downloaded to ${INPUT_FILE}`);

        console.log('Testing MP4 conversion...');
        const mp4Path = await convertToMp4(INPUT_FILE);
        if (fs.existsSync(mp4Path)) {
            console.log(`SUCCESS: MP4 created at ${mp4Path}`);
        } else {
            console.error('FAILURE: MP4 file not found.');
        }

        console.log('Testing GIF generation...');
        const gifPath = await generateGif(INPUT_FILE);
        if (fs.existsSync(gifPath)) {
            console.log(`SUCCESS: GIF created at ${gifPath}`);
        } else {
            console.error('FAILURE: GIF file not found.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        // Cleanup
        // fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        console.log('Test complete. Check temp_test_video folder for artifacts.');
    }
}

runTest();
