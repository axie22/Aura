import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export async function convertToMp4(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace('.webm', '.mp4');
    // Fast conversion using H.264
    const command = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k "${outputPath}"`;
    
    try {
        console.log(`[Video] Converting to MP4: ${command}`);
        await execPromise(command);
        console.log(`[Video] Conversion complete: ${outputPath}`);
        return outputPath;
    } catch (error: any) {
        console.error(`[Video] Failed to convert to MP4:`, error.message);
        throw error;
    }
}

export async function generateGif(inputPath: string): Promise<string> {
    const outputPath = inputPath.replace('.webm', '.gif');
    const command = `ffmpeg -y -i "${inputPath}" \
        -vf "fps=10,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
        -loop 0 "${outputPath}"`;

    try {
        console.log(`[Video] Generating GIF: ${command}`);
        await execPromise(command);
        console.log(`[Video] GIF created: ${outputPath}`);
        return outputPath;
    } catch (error: any) {
        console.error(`[Video] Failed to generate GIF:`, error.message);
        throw error;
    }
}
