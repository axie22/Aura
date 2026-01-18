import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class VirtualEnv {
    private basePath: string = '/tmp/aura-agent';
    private workDir: string | null = null;
    private serverProcess: any = null;

    private projectRoot: string | null = null;

    constructor(private prId: string) {}

    /**
     * Creates a clean workspace in /tmp/aura-agent/{prId}
     */
    async initialize(): Promise<string> {
        this.workDir = path.join(this.basePath, this.prId);
        
        try {
            // Clean up existing if present
            await fs.rm(this.workDir, { recursive: true, force: true });
            await fs.mkdir(this.workDir, { recursive: true });
        } catch (error: any) {
            throw new Error(`Failed to initialize workspace: ${error.message}`);
        }
        
        return this.workDir;
    }

    /**
     * Shallow clones the repository branch
     */
    async cloneRepo(repoUrl: string, branch: string): Promise<void> {
        if (!this.workDir) throw new Error("VirtualEnv not initialized");
        
        console.log(`Cloning ${repoUrl} (branch: ${branch}) into ${this.workDir}...`);
        try {
            await execAsync(`git clone --depth 1 --branch ${branch} ${repoUrl} .`, { cwd: this.workDir });
        } catch (error: any) {
            throw new Error(`Git clone failed: ${error.message}`);
        }
        
        await this.detectProjectRoot();
    }

    /**
     * Attempts to find the project root containing package.json
     */
    private async detectProjectRoot(): Promise<void> {
        if (!this.workDir) return;
        
        const rootPkg = path.join(this.workDir, 'package.json');
        try {
            await fs.access(rootPkg);
            this.projectRoot = this.workDir;
            console.log(`Project root detected at: ${this.projectRoot}`);
            return;
        } catch {
            
        }

        // 2. Search depth 1
        console.log("package.json not found in root. Searching subdirectories...");
        const entries = await fs.readdir(this.workDir, { withFileTypes: true });
        const dirs = entries.filter(dirent => dirent.isDirectory());

        for (const dir of dirs) {
            const subPkg = path.join(this.workDir, dir.name, 'package.json');
            try {
                await fs.access(subPkg);
                this.projectRoot = path.join(this.workDir, dir.name);
                console.log(`Project root detected at: ${this.projectRoot}`);
                return;
            } catch {
                continue;
            }
        }

        console.warn("WARNING: No package.json found in root or immediate subdirectories.");
        this.projectRoot = this.workDir;
    }

    /**
     * Installs dependencies using npm ci for reliability
     */
    async installDependencies(): Promise<void> {
        if (!this.projectRoot) throw new Error("Project root not detected");
        
        console.log(`Installing dependencies in ${this.projectRoot}...`);
        try {
            try {
                await fs.access(path.join(this.projectRoot, 'package-lock.json'));
                await execAsync('npm ci', { cwd: this.projectRoot });
            } catch {
                console.warn("No package-lock.json found. Falling back to npm install.");
                await execAsync('npm install', { cwd: this.projectRoot });
            }
        } catch (error: any) {
            throw new Error(`npm install failed: ${error.message}`);
        }
    }

    /**
     * Builds and starts the application server
     * Returns the local URL when ready
     */
    async startServer(buildCommand: string = 'npm run build', startCommand: string = 'npm start', port: number = 3000): Promise<string> {
        if (!this.projectRoot) throw new Error("Project root not detected");

        if (buildCommand) {
            try {
                const pkgJsonPath = path.join(this.projectRoot, 'package.json');
                const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
                const scriptName = buildCommand.replace('npm run ', '').trim();
                
                if (pkgJson.scripts && pkgJson.scripts[scriptName]) {
                    console.log(`Running build: ${buildCommand}...`);
                    await execAsync(buildCommand, { cwd: this.projectRoot });
                } else {
                    console.log(`Skipping build: script "${scriptName}" not found in package.json`);
                }
            } catch (error: any) {
                 throw new Error(`Build setup failed: ${error.message}`);
            }
        }

        // Start Process
        console.log(`Starting server: ${startCommand} on port ${port}...`);
        const [cmd, ...args] = startCommand.split(' ');
        
        this.serverProcess = spawn(cmd, args, {
            cwd: this.projectRoot,
            detached: true, // Allows process to have its own group
            stdio: 'inherit',
            env: { ...process.env, PORT: port.toString() }
        });

        // Detach so the parent can exit independently if needed, though we track it
        this.serverProcess.unref();

        // Health Check
        const url = `http://localhost:${port}`;
        const startTime = Date.now();
        const timeoutMs = 90000;

        while (Date.now() - startTime < timeoutMs) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    console.log('Server is ready!');
                    return url;
                }
            } catch (e) {
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.cleanup();
        throw new Error("Server failed to allow connections within 90 seconds");
    }

    /**
     * Cleans up the server process and the workspace
     */
    cleanup(deleteWorkspace: boolean = false): void {
        if (this.serverProcess) {
            console.log('Stopping server process...');
            try {
                process.kill(-this.serverProcess.pid); 
            } catch (e) {
            }
            this.serverProcess = null;
        }

        if (deleteWorkspace && this.workDir) {
           fs.rm(this.workDir, { recursive: true, force: true });
        }
    }
}
