import { mock } from "ts-mockito";
import { IDebugConfiguration, IWorkspaceConfiguration, IWorkspaceFolder, SettingsProvider } from '../src/Infrastructure/Infrastructure';
import { Log } from 'vscode-test-adapter-util';
import { expect } from "chai";


class TestSettingsProvider extends SettingsProvider{
    protected config: IWorkspaceConfiguration;

    constructor(logger: Log, vscodeSettings: IWorkspaceConfiguration) {
        super(logger);

        this.config = vscodeSettings;
    }
    protected GetConfig(section: string): IWorkspaceConfiguration {
        return this.config;
    }

    GetObjDumpPath(): string {
        return this.config.objDumpExecutable ?? "";
    }
    GetTestRunners(): string[] {
        return this.SplitRunners(this.config.testExecutable);
    }
    GetTestPath(): string {
        return this.ResolveSettingsVariable(this.config.testExecutablePath);
    }
    GetDebugConfiguration(): (IDebugConfiguration | undefined) {
        return {
            name :"",
            args: undefined,
            program: undefined,
            target: undefined
        }
    }
    GetWorkspaceFolders(): readonly IWorkspaceFolder[] | undefined {
        return [{
            name: "myWorkspace",
            index: 1,
            uri: "."
        }];
    }
    protected GetCurrentFilename(): string {
        return "myFile.c";
    }
    protected GetCurrentWorkspaceFolder(): string {
        return "myFolder";
    }

}

describe("SettingsProvider should", () => {
  it("return all executables", () => {
    const logger = mock<Log>();
    const expectedPath = "/mnt/myPath";

    const config = {
        debugLaunchConfigurationName: "",
        objDumpExecutable : "",
        logfile: "",
        logpanel: false,
        testExecutable: "",
        testExecutablePath: expectedPath,
        testLocationFetchMode: ""
    }

    const settingsProvider = new TestSettingsProvider(logger, config);

    const actualPath = settingsProvider.GetTestPath()
    expect(actualPath).to.be.eq(expectedPath);
  })
});