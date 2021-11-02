import { DebugConfiguration, WorkspaceFolder } from "vscode";
import { CppUTestGroup } from "./CppUTestGroup";
import CppUTestSuite from "./CppUTestSuite";
import { TestResult } from "./TestResult";
import { CppUTest } from "./CppUTest";
import { TestState } from "./TestState";
import { ResultParser } from "./ResultParser";
import ExecutableRunner from "../Infrastructure/ExecutableRunner";
import { SettingsProvider } from "../Infrastructure/SettingsProvider";
import { VscodeAdapter } from "../Infrastructure/VscodeAdapter";

export default class CppUTestContainer {
  private runners: ExecutableRunner[];
  private suites: Map<string, CppUTestGroup>;
  private settingsProvider: SettingsProvider;
  private vscodeAdapter: VscodeAdapter;
  private resultParser: ResultParser;
  private onTestFinishHandler: (test: CppUTest, result: TestResult) => void = () => { };
  private onTestStartHandler: (test: CppUTest) => void = () => { };
  // private dirty: boolean;
  public set OnTestFinish(handler: (test: CppUTest, result: TestResult) => void) {
    this.onTestFinishHandler = handler;
  }
  public set OnTestStart(handler: (test: CppUTest) => void) {
    this.onTestStartHandler = handler;
  }
  public set OnTestExecutableReload(handler: () => void) {
    this.runners.map(runner => runner.OnFileChange = handler);
  }

  constructor(runners: ExecutableRunner[], settingsProvider: SettingsProvider, vscodeAdapter: VscodeAdapter, resultParser: ResultParser) {
    this.settingsProvider = settingsProvider;
    this.runners = runners;
    this.vscodeAdapter = vscodeAdapter;
    this.resultParser = resultParser;
    this.suites = new Map<string, CppUTestGroup>();
  }

  public LoadTests(): Promise<CppUTestGroup[]> {
    return Promise.all(this.runners
      .map(runner => runner.GetTestList()
        .then(testString => this.EmbedInRunnerGroup(runner, testString))
        .catch(error => new CppUTestGroup("ERROR ON LOADING TESTS"))
      ));
  }

  public ClearTests() {
    this.suites = new Map<string, CppUTestGroup>();
  }

  public async RunAllTests(): Promise<TestResult[]> {
    const testList = await this.LoadTests();
    const testResults: TestResult[] = new Array<TestResult>();
    for (const executableGroup of testList) {
      for (const testGroup of executableGroup.children) {
        for (const test of (testGroup as CppUTestGroup).children) {
          const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
          this.onTestStartHandler((test as CppUTest));
          const resultString = await runner.RunTest(testGroup.label, test.label);
          const testResult = this.resultParser.GetResult(resultString);
          this.onTestFinishHandler((test as CppUTest), testResult);
          testResults.push(testResult);
        }
      }
    }
    return testResults;
  }

  public async RunTest(...testId: string[]): Promise<TestResult[]> {
    const testList = await this.LoadTests();
    const testResults: TestResult[] = new Array<TestResult>();
    const testsToRun: CppUTest[] = new Array<CppUTest>();
    for (const executableGroup of testList) {
      testsToRun.splice(0, testsToRun.length);
      if (testId.includes(executableGroup.id)) {
        testsToRun.push(...executableGroup.Tests);
      } else {
        for (const testGroup of executableGroup.children) {
          testsToRun.push(...this.GetAllChildTestsById(testId, (testGroup as CppUTestGroup)));
        }
      }
      const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
      for (const test of testsToRun) {
        if (test && runner) {
          this.onTestStartHandler(test);
          try {
            const resultString = await runner.RunTest(test.group, test.label);
            const testResult = this.resultParser.GetResult(resultString);
            this.onTestFinishHandler(test, testResult);
            testResults.push(testResult);
          } catch (error) {
            console.error(error);
          }
        }
      }
    }
    if (testResults.length > 0) {
      return testResults;
    }
    return [new TestResult(TestState.Failed, "Unable to run or find test")];
  }

  public async DebugTest(...testId: string[]): Promise<void> {
    const config = this.settingsProvider.GetDebugConfiguration();
    const workspaceFolders = this.settingsProvider.GetWorkspaceFolders();
    if (config === "") {
      throw new Error("No debug configuration found. Not able to debug!");
    }
    if (!workspaceFolders) {
      throw new Error("No workspaceFolders found. Not able to debug!");
    }
    const testList = await this.LoadTests();
    for (const executableGroup of testList) {
      const testOrGroup = this.GetGroupOrTest(testId, executableGroup);
      const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
      if (testOrGroup && runner) {
        const isTest = testOrGroup instanceof CppUTest;
        const testRunName = isTest ? `${testOrGroup.group}.${testOrGroup.label}` : `${testOrGroup.label}`;
        const testRunArg = isTest ? "-t" : "-sg";
        (config as DebugConfiguration).name = testRunName;
        (config as DebugConfiguration).args = [testRunArg, testRunName];
        (config as DebugConfiguration).program = runner.Command;
        (config as DebugConfiguration).target = runner.Command;
        await this.vscodeAdapter.StartDebugger((workspaceFolders as WorkspaceFolder[]), config);
      }
    }
  }

  private GetGroupOrTest(testIds: string[], testEntity: CppUTestGroup | CppUTest): CppUTestGroup | CppUTest | undefined {
    if (testEntity instanceof CppUTestGroup) {
      for (const child of testEntity.children) {
        const entity = this.GetGroupOrTest(testIds, (child as CppUTest | CppUTestGroup));
        if (entity) return entity;
      }
    }
    for (const testId of testIds) {
      if (testEntity.id === testId) {
        return testEntity;
      }
    }
    return undefined;
  }

  public KillRunningProcesses() {
    this.runners.forEach(r => r.KillProcess());
  }

  private GetAllChildTestsById(testId: string[], testGroup: CppUTestGroup): CppUTest[] {
    const tests: CppUTest[][] = testId.map(id => (testGroup as CppUTestGroup).FindTest(id));
    return Array<CppUTest>().concat(...tests);
  }

  private async EmbedInRunnerGroup(runner: ExecutableRunner, testString: string): Promise<CppUTestGroup> {
    if (this.suites.has(runner.Name)) {
      return (this.suites.get(runner.Name) as CppUTestGroup);
    }
    const testFactory = new CppUTestSuite(runner.Name);
    const testGroup = testFactory.CreateTestGroupsFromTestListString(testString);
    for(const test of testGroup.Tests) {
      try {
        const debugString = await runner.GetDebugSymbols(test.group, test.label);
        testFactory.AddDebugInformationToTest(test, debugString);
      } catch (error) {
        console.error(error);
      }
    }
    this.suites.set(runner.Name, testGroup);
    return testGroup;
  }
}
