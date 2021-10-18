import * as vscode from 'vscode';
import { glob } from 'glob';

export default class SettingsProvider {
  private readonly Executables: string;
  private readonly ExecutablePath: string;

  constructor(config: vscode.WorkspaceConfiguration) {
    this.Executables = config.testExecutable;
    this.ExecutablePath = config.testExecutablePath;
  }

  public GetTestRunners(): string[] {
    const runners: string[] = this.SplitRunners(this.Executables);
    return runners.map(runner => this.ResolveSettingsVariable(runner));
  }

  public GetTestPath(): string {
    return this.ResolveSettingsVariable(this.ExecutablePath);
  }

  private SplitRunners(executablesString: string | undefined): string[] {
    if (executablesString) {
      return executablesString
        .split(";")
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
