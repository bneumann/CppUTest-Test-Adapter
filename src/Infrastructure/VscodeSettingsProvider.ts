import * as vscode from 'vscode';
import glob = require('glob');
import { SettingsProvider } from './SettingsProvider';
import { IWorkspaceConfiguration } from './IWorkspaceConfiguration';
import { IDebugConfiguration } from './IDebugConfiguration';
import { Log } from 'vscode-test-adapter-util';
import { IWorkspaceFolder } from './IWorkspaceFolder';


export default class VscodeSettingsProvider extends SettingsProvider {
  private configSection: string = "cpputestTestAdapter";

  constructor(log: Log) {
    super(log)

    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(this.configSection)) {
        const wsConfig = vscode.workspace.getConfiguration(this.configSection);
        this.config = {
          debugLaunchConfigurationName: wsConfig["debugLaunchConfigurationName"],
          logfile: wsConfig["logfile"],
          logpanel: wsConfig["logpanel"],
          objDumpExecutable: wsConfig["objDumpExecutable"],
          testExecutable: wsConfig["testExecutable"],
          testExecutablePath: wsConfig["testExecutablePath"],
          testLocationFetchMode: wsConfig["testLocationFetchMode"],
          preLaunchTask: wsConfig["preLaunchTask"]
        }
      }
    })
  }

  protected override GetConfig(configSection: string): IWorkspaceConfiguration {
    return (vscode.workspace.getConfiguration(configSection) as any);
  }

  public override GetPreLaunchTask(): string {
      return this.config.preLaunchTask;
    }

  GetObjDumpPath(): string {
    return this.ResolveSettingsVariable(this.config.objDumpExecutable);
  }

  GetWorkspaceFolders(): readonly IWorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders;
  }

  public GetTestRunners(): string[] {
    return this.SplitRunners(this.config.testExecutable);
  }

  public GetTestPath(): string {
    return this.ResolveSettingsVariable(this.config.testExecutablePath);
  }

  public GetDebugConfiguration(): (IDebugConfiguration | undefined) {
    // Thanks to: https://github.com/matepek/vscode-catch2-test-adapter/blob/9a2e9f5880ef3907d80ff99f3d6d028270923c95/src/Configurations.ts#L125
    if (vscode.workspace.workspaceFolders === undefined) {
      return undefined;
    }
    const wpLaunchConfigs: string | undefined = vscode.workspace
      .getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri)
      .get<string>('configurations');

    const hasConfiguredLaunchProfiles: boolean = this.config.debugLaunchConfigurationName !== undefined;

    if (wpLaunchConfigs && Array.isArray(wpLaunchConfigs) && wpLaunchConfigs.length > 0) {
      if (hasConfiguredLaunchProfiles) {
        // try and match the config by name
        for (let i = 0; i < wpLaunchConfigs.length; ++i) {
          if (wpLaunchConfigs[i].name == this.config.debugLaunchConfigurationName) {
            const debugConfig: vscode.DebugConfiguration = Object.assign({}, wpLaunchConfigs[i], {
              program: "",
              target: ""
            });
            return debugConfig;
          }
        }
      }

      //fallback to the first debug configuration that is a c++ debugger
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

    return undefined;
  }

  protected GlobFiles(wildcardString: string): string[] {
    return glob.sync(wildcardString)
  }

  protected override GetCurrentFilename(): string {
    return vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath : "";
  }

  protected override GetCurrentWorkspaceFolder(): string {
    return vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "";
  }
}
