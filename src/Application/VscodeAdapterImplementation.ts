import { DebugConfiguration, WorkspaceFolder } from "vscode";
import * as vscode from "vscode";
import { VscodeAdapter } from "../Infrastructure/VscodeAdapter";

export class VscodeAdapterImplementation implements VscodeAdapter {
  public async StartDebugger(workspaceFolders: WorkspaceFolder[], config: string | DebugConfiguration): Promise<void> {
    await vscode.debug.startDebugging(workspaceFolders[0], config);
  }
}
