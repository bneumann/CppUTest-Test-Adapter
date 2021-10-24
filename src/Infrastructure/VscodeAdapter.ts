import { DebugConfiguration, WorkspaceFolder } from "vscode";

export interface VscodeAdapter {
  StartDebugger(workspaceFolders: WorkspaceFolder[], config: string | DebugConfiguration): Promise<void>;
}
