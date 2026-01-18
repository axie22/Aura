import fs from 'fs/promises';
import path from 'path';
import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';

export class VirtualEnv {
    private basePath: string = '/tmp/aura-agent';
    private workDir: string | null = null;
    private serverProcess: ChildProcess | null = null; // Type updated
    private currentProc: ChildProcess | null = null; // Track current exec command
    private aborted: boolean = false;

    private projectRoot: string | null = null;

    constructor(private prId: string) {}

    /**
     * Aborts any ongoing operation
     */
    abort(): void {
        this.aborted = true;
        if (this.currentProc) {
            try {
                this.currentProc.kill();
            } catch (e) {
                // Ignore
            }
        }
        if (this.serverProcess) {
            try {
                this.serverProcess.kill();
            } catch (e) {
                // Ignore
            }
        }
    }

    private async execCommand(command: string, options: any = {}, ignoreAbort: boolean = false): Promise<void> {
        if (this.aborted && !ignoreAbort) throw new Error("Operation aborted");

        return new Promise((resolve, reject) => {
            this.currentProc = exec(command, options, (error, stdout, stderr) => {
                this.currentProc = null;
                if (this.aborted && !ignoreAbort) {
                    return reject(new Error("Operation aborted"));
                }
                if (error) {
                    return reject(error);
                }
                resolve();
            });
        });
    }

    async initialize(): Promise<string> {
        if (this.aborted) throw new Error("Operation aborted");
        this.workDir = path.join(this.basePath, this.prId);
        
        try {
            // Clean up existing if present forcefully
            // Using rm -rf via shell is more robust than fs.rm for deep node_modules
            await this.execCommand(`rm -rf "${this.workDir}"`);
            
            if (this.aborted) throw new Error("Operation aborted");
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
        if (this.aborted) throw new Error("Operation aborted");
        
        console.log(`Cloning ${repoUrl} (branch: ${branch}) into ${this.workDir}...`);
        try {
            await this.execCommand(`git clone --depth 1 --branch ${branch} ${repoUrl} .`, { cwd: this.workDir });
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
        if (this.aborted) throw new Error("Operation aborted");
        
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
            if (this.aborted) throw new Error("Operation aborted");
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
        if (this.aborted) throw new Error("Operation aborted");
        
        console.log(`Installing dependencies in ${this.projectRoot}...`);
        try {
            try {
                await fs.access(path.join(this.projectRoot, 'package-lock.json'));
                await this.execCommand('npm ci', { cwd: this.projectRoot });
            } catch {
                console.warn("No package-lock.json found. Falling back to npm install.");
                await this.execCommand('npm install', { cwd: this.projectRoot });
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
        if (this.aborted) throw new Error("Operation aborted");

        if (buildCommand) {
            try {
                const pkgJsonPath = path.join(this.projectRoot, 'package.json');
                const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
                const scriptName = buildCommand.replace('npm run ', '').trim();
                
                if (pkgJson.scripts && pkgJson.scripts[scriptName]) {
                    console.log(`Running build: ${buildCommand}...`);
                    await this.execCommand(buildCommand, { cwd: this.projectRoot });
                } else {
                    console.log(`Skipping build: script "${scriptName}" not found in package.json`);
                }
            } catch (error: any) {
                 throw new Error(`Build setup failed: ${error.message}`);
            }
        }
        
        if (this.aborted) throw new Error("Operation aborted");

        let finalStartCommand = startCommand;
        try {
            const pkgJsonPath = path.join(this.projectRoot, 'package.json');
            const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
            const scripts = pkgJson.scripts || {};
            
            const scriptName = startCommand.replace('npm run ', '').replace('npm ', '').trim();

            if (!scripts[scriptName]) {
                console.warn(`WARNING: Script "${scriptName}" not found in package.json.`);
                if (scripts.dev) {
                    console.log('Falling back to "npm run dev"...');
                    finalStartCommand = 'npm run dev';
                } else if (scripts.serve) {
                    console.log('Falling back to "npm run serve"...');
                    finalStartCommand = 'npm run serve';
                } else {
                    console.warn('No "dev" or "serve" fallback found. Attempting requested command anyway.');
                }
            }
        } catch (e) {
            console.warn('Failed to validate start script, proceeding blindly.');
        }

        console.log(`Starting server: ${finalStartCommand} on port ${port}...`);
        const [cmd, ...args] = finalStartCommand.split(' ');
        
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
            if (this.aborted) {
                this.cleanup();
                throw new Error("Operation aborted");
            }

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
    async cleanup(deleteWorkspace: boolean = false): Promise<void> {
        if (this.serverProcess) {
            console.log('Stopping server process...');
            try {
                // Check if pid exists before killing
                if (this.serverProcess.pid) process.kill(-this.serverProcess.pid); 
            } catch (e) {
                // Process might be already gone
            }
            this.serverProcess = null;
        }

        if (deleteWorkspace && this.workDir) {
           try {
               // Use rm -rf for robustness
               // Pass true to ignore aborted state because we still want to clean up
               await this.execCommand(`rm -rf "${this.workDir}"`, {}, true);
           } catch (e) {
               console.error(`Failed to delete workspace ${this.workDir}:`, e);
           }
        }
    }
}
