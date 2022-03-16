import { ExecException } from "child_process";
import { basename, dirname } from "path";
import { ProcessExecuter } from "../Application/ProcessExecuter";
import { TestLocationFetchMode } from "./SettingsProvider";

export default class ExecutableRunner {
  private readonly exec: Function;
  private readonly execFile: Function;
  private readonly kill: Function;
  private readonly command: string;
  private readonly workingDirectory: string;
  private readonly tempFile: string;
  public readonly Name: string;
  private dumpCached: boolean;
  private tryGetLocation: boolean;

  constructor(processExecuter: ProcessExecuter, command: string, workingDirectory: string = dirname(command)) {
    this.exec = processExecuter.Exec;
    this.execFile = processExecuter.ExecFile;
    this.kill = processExecuter.KillProcess;
    this.command = command;
    this.workingDirectory = workingDirectory;
    this.Name = basename(command);
    this.tempFile = `${this.Name}.dump`
    this.dumpCached = false;
    this.tryGetLocation = true;
  }

  public get Command(): string { return this.command; }

  public GetTestList(testLocationFetchMode: TestLocationFetchMode): Promise<[string, boolean]> {
    switch (testLocationFetchMode) {
      case TestLocationFetchMode.TestQuery:
        return this.GetTestListWithLocation(true);
      case TestLocationFetchMode.Auto:
        if (this.tryGetLocation) {
          return this.GetTestListWithLocation(false).catch( () => {
            this.tryGetLocation = false;
            return this.GetTestListGroupAndNames();
          });
        } else {
          return this.GetTestListGroupAndNames();
        }
      default:
        return this.GetTestListGroupAndNames();
    }
  }

  private GetTestListWithLocation(printError: boolean): Promise<[string, boolean]> {
    return new Promise<[string, boolean]>((resolve, reject) => this.execFile(this.command, ["-ll"], { cwd: this.workingDirectory }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        if (printError) {
          console.error('stderr', error);
        }
        reject(error);
      }
      resolve([stdout, true]);
    }));
  }

  private GetTestListGroupAndNames(): Promise<[string, boolean]> {
    return new Promise<[string, boolean]>((resolve, reject) => this.execFile(this.command, ["-ln"], { cwd: this.workingDirectory }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('stderr', error);
        reject(error);
      }
      resolve([stdout, false]);
    }));
  }

  // TODO: Make this abstract in case windows will be required
  public GetDebugSymbols(group: string, test: string): Promise<string> {
    const sourceGrep = `grep -m 2 -A 2 TEST_${group}_${test} ${this.tempFile}`;
    // Windows:
    // const sourceGrep = `findstr TEST_${group}_${test}`
    return this.DumpSymbols().then(() => {
      return new Promise<string>((resolve, reject) => {
        this.exec(sourceGrep, { cwd: this.workingDirectory }, (error: ExecException | null, stdout: string, stderr: string) => {
          if (error) {
            console.error('stderr', error);
            reject(stderr);
          } else {
            resolve(stdout);
          }
        });
      });
    })
  }

  private DumpSymbols(): Promise<void> {
    if (this.dumpCached) { return Promise.resolve(); }
    // Linux:
    const sourceGrep = `objdump -lSd ${this.command} > ${this.tempFile}`;
    // Windows:
    // const sourceGrep = `windObjDumpOrWhatEver ${command} | findstr TEST_${group}_${test}`
    return new Promise<void>((resolve, reject) => {
      this.exec(sourceGrep, { cwd: this.workingDirectory }, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          console.error('stderr', error);
          reject(stderr);
        } else {
          this.dumpCached = true;
          resolve();
        }
      });
    });
  }

  public RunTest(group: string, test: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.execFile(this.command, ["-sg", group, "-sn", test, "-v"], { cwd: this.workingDirectory }, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error && error.code === null) {
          console.error('stderr', error);
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
