import { DebugConfiguration, WorkspaceFolder } from 'vscode';

export interface SettingsProvider {
  GetTestRunners(): string[];
  GetTestPath(): string;
  GetDebugConfiguration(): (DebugConfiguration | string);
  GetWorkspaceFolders(): WorkspaceFolder[] | undefined
}
