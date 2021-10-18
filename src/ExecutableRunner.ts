import { ExecException } from "child_process";
import { basename } from "path";

export default class ExecutableRunner {
  private readonly exec: Function;
  private readonly execFile: Function;
  private readonly command: string;
  public readonly Name: string;

  constructor(exec: Function, execFile: Function, command: string) {
    this.exec = exec;
    this.execFile = execFile;
    this.command = command;
    this.Name = basename(command);
  }

  public GetTestList(): Promise<string> {
    return new Promise<string>((resolve, reject) => this.execFile(this.command, ["-ln"], { cwd: "" }, (error: any, stdout: any, stderr: any) => {
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
      this.exec(sourceGrep, { cwd: "" }, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error('stderr', error.cmd);
          reject(stderr);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}
