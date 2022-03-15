import * as vscode from 'vscode';
import { glob } from 'glob';
import { SettingsProvider, TestLocationFetchMode } from './SettingsProvider';

export default class VscodeSettingsProvider implements SettingsProvider {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    const configSection = "cpputestTestAdapter";
    this.config = vscode.workspace.getConfiguration(configSection);
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(configSection)) {
        this.config = vscode.workspace.getConfiguration(configSection);
      }
    })
  }

  GetWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
  }

  public GetTestRunners(): string[] {
    return this.SplitRunners(this.config.testExecutable);
  }

  public GetTestPath(): string {
    return this.ResolveSettingsVariable(this.config.testExecutablePath);
  }

  public get TestLocationFetchMode(): TestLocationFetchMode {
    switch(this.config.testLocationFetchMode) {
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

  public GetDebugConfiguration(): (vscode.DebugConfiguration | string) {
    // Thanks to: https://github.com/matepek/vscode-catch2-test-adapter/blob/9a2e9f5880ef3907d80ff99f3d6d028270923c95/src/Configurations.ts#L125
    if (vscode.workspace.workspaceFolders === undefined) {
      return "";
    }
    const wpLaunchConfigs: string | undefined = vscode.workspace
      .getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri)
      .get<string>('configurations');
    if (wpLaunchConfigs && Array.isArray(wpLaunchConfigs) && wpLaunchConfigs.length > 0) {
      for (let i = 0; i < wpLaunchConfigs.length; ++i) {
        if (this.IsCCppDebugger(wpLaunchConfigs[i])) {
          const debugConfig: vscode.DebugConfiguration = Object.assign({}, wpLaunchConfigs[i], {
            program: "",
            target: ""
          });
          return debugConfig;
        }
      }
    }
    return "";
  }

  private IsCCppDebugger(config: any) {
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

  private SplitRunners(executablesString: string | undefined): string[] {
    if (executablesString) {
      return executablesString
        .split(";")
        .map(r => this.ResolveSettingsVariable(r))
        .map(r => glob.sync(r))
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
  private ResolveSettingsVariable(input: string | undefined): string {
    if (input) {
      const result: string[] | null = input.match(/\$\{(.*)\}/gmi);
      if (result && result.length > 0) {
        input = input.replace(/(\$\{file\})/gmi, vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath : "");
        input = input.replace(/(\$\{workspaceFolder\})/gmi, vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "");
      }
      return input;
    }
    else {
      return "";
    }
  }
}
