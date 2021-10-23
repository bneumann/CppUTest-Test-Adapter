import { ProcessExecuter } from "./ProcessExecuter";
import { exec, execFile, ChildProcess, ExecException } from "child_process";

type execCallbackType = (error: ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => void;

export class NodeProcessExecuter implements ProcessExecuter {
    public readonly Exec: Function;
    public readonly ExecFile: Function;
    public readonly KillProcess: Function;
    private process: ChildProcess | undefined;

    constructor() {
        this.Exec = this.exec;
        this.ExecFile = this.execFile;
        this.KillProcess = this.killProcess;
    }

    private exec(cmd: string, options: any, callback: execCallbackType): ChildProcess {
        this.process = exec(cmd, options, callback);
        return this.process;
    }

    private execFile(cmd: string, args: any, options: any, callback: execCallbackType): ChildProcess {
        this.process = execFile(cmd, args, options, callback);
        return this.process;
    }

    private killProcess(): void {
        this.process?.kill("SIGTERM");
    }
}