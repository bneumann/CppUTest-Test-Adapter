import { mock } from "ts-mockito";
import { IDebugConfiguration, IWorkspaceConfiguration, IWorkspaceFolder, SettingsProvider } from '../src/Infrastructure/Infrastructure';
import { Log } from 'vscode-test-adapter-util';
import { expect } from "chai";


class TestSettingsProvider extends SettingsProvider {
    protected config: IWorkspaceConfiguration;
    private filesToFind: string[];

    constructor(logger: Log, vscodeSettings: IWorkspaceConfiguration, filesToFind: string[]) {
        super(logger);

        this.config = vscodeSettings;
        this.filesToFind = filesToFind;
    }
    protected GetConfig(section: string): IWorkspaceConfiguration {
        return this.config;
    }
    
    public GetPreLaunchTask(): string {
        return this.config.preLaunchTask;
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
            name: "",
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
    protected GlobFiles(wildcardString: string): string[] {
        if(wildcardString.indexOf("*") === -1)
            return [wildcardString];
        const splitPath = wildcardString.split("/");
        const testPrefix = splitPath.slice(-1)[0].slice(0, -1);
        const binFolder = splitPath.slice(0, -1).join("/")
        return this.filesToFind
            .filter(f => f.indexOf(testPrefix) != -1)
            .map(file => `${binFolder}/${file}`);
    }
}

describe("SettingsProvider should", () => {
    const config: IWorkspaceConfiguration = {
        debugLaunchConfigurationName: "",
        objDumpExecutable: "",
        logfile: "",
        logpanel: false,
        testExecutable: "",
        testExecutablePath: "",
        testLocationFetchMode: "",
        preLaunchTask: ""
    };
    let filesToFind = [""];

    it("return all executables", () => {
        const logger = mock<Log>();
        const expectedPath = "/mnt/myPath/myExecutable";

        config.testExecutable = "/mnt/myPath/myExecutable";

        const settingsProvider = new TestSettingsProvider(logger, config, filesToFind);

        const actualPath = settingsProvider.GetTestRunners()
        expect(actualPath).to.have.members([expectedPath]);
    })

    it("return all executables with wildcard", () => {
        const logger = mock<Log>();
        const expectedPath = [
            "myFolder/unittest/build/HAL_UnitTests1",
            "myFolder/unittest/build/HAL_UnitTests2",
            "myFolder/unittest/build/HAL_UnitTests3"];

        config.testExecutable = "${workspaceFolder}/unittest/build/HAL_UnitTests*";
        filesToFind = [
            "HAL_UnitTests1",
            "HAL_UnitTests2",
            "HAL_UnitTests3",
        ]
        const settingsProvider = new TestSettingsProvider(logger, config, filesToFind);

        const actualPath = settingsProvider.GetTestRunners()
        expect(actualPath).to.be.deep.eq(expectedPath);
    })

    it("return all executables in different paths with wildcard", () => {
        const logger = mock<Log>();
        const expectedPath = [
            "myFolder/app/build/App_UnitTests1",
            "myFolder/app/build/App_UnitTests2",
            "myFolder/hal/build/HAL_UnitTests1",
            "myFolder/hal/build/HAL_UnitTests2",
            "myFolder/hal/build/HAL_UnitTests3",
            "myFolder/pal/build/PAL_UnitTests1",
        ];

        config.testExecutable = "${workspaceFolder}/app/build/App_UnitTests*;" +
            "${workspaceFolder}/pal/build/PAL_UnitTests*;" +
            "${workspaceFolder}/hal/build/HAL_UnitTests*";
        filesToFind = [
            "App_UnitTests1",
            "App_UnitTests2",
            "HAL_UnitTests1",
            "HAL_UnitTests2",
            "HAL_UnitTests3",
            "PAL_UnitTests1"
        ]
        const settingsProvider = new TestSettingsProvider(logger, config, filesToFind);

        const actualPath = settingsProvider.GetTestRunners()
        expect(actualPath).to.have.members(expectedPath);
    })
});