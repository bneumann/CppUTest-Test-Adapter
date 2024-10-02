import { Log } from 'vscode-test-adapter-util';
import { IWorkspaceFolder } from './IWorkspaceFolder';
import { IDebugConfiguration } from './IDebugConfiguration';
import { IWorkspaceConfiguration } from './IWorkspaceConfiguration';
import { TestLocationFetchMode } from './TestLocationFetchMode';

export abstract class SettingsProvider {

  protected log: Log;
  protected config: IWorkspaceConfiguration;

  constructor(log: Log) {
    const configSection = "cpputestTestAdapter";

    this.log = log;
    this.config = this.GetConfig(configSection);
  }

  protected abstract GetConfig(section: string): IWorkspaceConfiguration;
  abstract GetObjDumpPath(): string;
  abstract GetTestRunners(): string[];
  abstract GetTestPath(): string;
  abstract GetDebugConfiguration(): (IDebugConfiguration | undefined);
  abstract GetWorkspaceFolders(): readonly IWorkspaceFolder[] | undefined
  protected abstract GetCurrentFilename(): string
  protected abstract GetCurrentWorkspaceFolder(): string
  protected abstract GlobFiles(wildcardString: string): string[]

  public get TestLocationFetchMode(): TestLocationFetchMode {
    switch (this.config.testLocationFetchMode) {
      case 'test query':
        return TestLocationFetchMode.TestQuery;
      case 'debug dump':
        return TestLocationFetchMode.DebugDump;
      case 'auto':
        return TestLocationFetchMode.Auto;
      case 'disabled':
      default:
        return TestLocationFetchMode.Disabled;
    }
  }

  protected IsCCppDebugger(config: any) {
    const isWin = process.platform === "win32";
    // This is my way of saying: If we are using windows check for a config that has an .exe program.
    const executionExtension: boolean = isWin ? config.program.endsWith(".exe") : true;
    return config.request == 'launch' &&
      typeof config.type == 'string' &&
      executionExtension &&
      (config.type.startsWith('cpp') ||
        config.type.startsWith('lldb') ||
        config.type.startsWith('gdb'));
  }

  protected SplitRunners(executablesString: string | undefined): string[] {
    if (executablesString) {
      if (executablesString.indexOf(";") === -1) {
        return this.GlobFiles(this.ResolveSettingsVariable(executablesString));
      }
      return executablesString
        .split(";")
        .map(r => this.ResolveSettingsVariable(r))
        .map(r => this.GlobFiles(r))
        .reduce((flatten, arr) => [...flatten, ...arr]);
    } else {
      return [];
    }
  }

  /**
 * This function converts some of the VSCode variables like workspaceFolder
 * into their correspoing values. This is a workaround for https://github.com/microsoft/vscode/issues/46471
 * @param input Input string from settings.json
 */
  protected ResolveSettingsVariable(input: string | undefined): string {
    if (input) {
      const result: string[] | null = input.match(/\$\{(.*)\}/gmi);
      if (result && result.length > 0) {
        this.log.info(`replacing config variabe "${input}"`);
        input = input.replace(/(\$\{file\})/gmi, this.GetCurrentFilename());
        input = input.replace(/(\$\{workspaceFolder\})/gmi, this.GetCurrentWorkspaceFolder());
        this.log.info(`replaced variable is now "${input}"`);
      }
      return input;
    }
    else {
      return "";
    }
  }
}
