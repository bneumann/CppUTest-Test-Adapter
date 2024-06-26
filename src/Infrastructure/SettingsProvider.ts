import { DebugConfiguration, WorkspaceFolder } from 'vscode';

export enum TestLocationFetchMode {
  Auto,
  TestQuery,
  DebugDump,
  Disabled
}

export interface SettingsProvider {
  GetObjDumpPath(): string;
  GetTestRunners(): string[];
  GetTestPath(): string;
  get TestLocationFetchMode(): TestLocationFetchMode;
  GetDebugConfiguration(): (DebugConfiguration | string);
  GetWorkspaceFolders(): readonly WorkspaceFolder[] | undefined
}
