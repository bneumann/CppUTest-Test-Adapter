import { ExecException } from "child_process";
import { basename, dirname } from "path";
import { ProcessExecuter } from "../Application/ProcessExecuter";

export default class ExecutableRunner {
  private readonly exec: Function;
  private readonly execFile: Function;
  private readonly kill: Function;
  private readonly command: string;
  private readonly workingDirectory: string;
  public readonly Name: string;

  constructor(processExecuter: ProcessExecuter, command: string, workingDirectory: string = dirname(command)) {
    this.exec = processExecuter.Exec;
    this.execFile = processExecuter.ExecFile;
    this.kill = processExecuter.KillProcess;
    this.command = command;
    this.workingDirectory = workingDirectory;
    this.Name = basename(command);
  }

  public get Command(): string { return this.command; }

  public GetTestList(): Promise<string> {
    return new Promise<string>((resolve, reject) => this.execFile(this.command, ["-ln"], { cwd: this.workingDirectory }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('stderr', stderr);
        reject(error);
      }
      resolve(stdout);
    }));
  }

  // TODO: Make this abstract in case windows will be required
  public GetDebugSymbols(group: string, test: string): Promise<string> {
    // Linux:
    const sourceGrep = `objdump -lSd ${this.command} | grep -m 2 -A 2 TEST_${group}_${test}`;
    // Windows:
    // const sourceGrep = `windObjDumpOrWhatEver ${command} | findstr TEST_${group}_${test}`
    return new Promise<string>((resolve, reject) => {
      this.exec(sourceGrep, { cwd: this.workingDirectory }, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error('stderr', error.cmd);
          reject(stderr);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  public RunTest(group: string, test: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.execFile(this.command, ["-sg", group, "-sn", test, "-v"], { cwd: this.workingDirectory }, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error && error.code === null) {
          reject(stderr);
        }
        resolve(stdout);
      })
    });
  }

  public KillProcess() {
    this.kill();
  }
}
