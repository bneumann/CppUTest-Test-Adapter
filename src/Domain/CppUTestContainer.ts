import { CppUTestGroup } from "./CppUTestGroup";
import CppUTestSuite from "./CppUTestSuite";
import { TestResult } from "./TestResult";
import ExecutableRunner from "../Infrastructure/ExecutableRunner";
import { CppUTest } from "./CppUTest";
import { TestState } from "./TestState";
import { SettingsProvider } from "../Infrastructure/SettingsProvider";
import { VscodeAdapter } from "../Infrastructure/VscodeAdapter";
import { DebugConfiguration } from "vscode";

export default class CppUTestContainer {

  private runners: ExecutableRunner[];
  private suites: Map<string, CppUTestGroup>;
  private settingsProvider: SettingsProvider;
  private vscodeAdapter: VscodeAdapter;
  private onTestFinishHandler: (test: CppUTest, result: TestResult) => void = () => { };
  private onTestStartHandler: (test: CppUTest) => void = () => { };
  // private dirty: boolean;
  public set OnTestFinish(handler: (test: CppUTest, result: TestResult) => void) {
    this.onTestFinishHandler = handler;
  }
  public set OnTestStart(handler: (test: CppUTest) => void) {
    this.onTestStartHandler = handler;
  }

  constructor(runners: ExecutableRunner[], settingsProvider: SettingsProvider, vscodeAdapter: VscodeAdapter) {
    this.settingsProvider = settingsProvider;
    this.runners = runners;
    this.vscodeAdapter = vscodeAdapter;
    this.suites = new Map<string, CppUTestGroup>();
  }

  public LoadTests(): Promise<CppUTestGroup[]> {
    return Promise.all(this.runners
      .map(runner => runner.GetTestList()
        .then(testString => this.EmbedInRunnerGroup(runner.Name, testString))
      ));
  }

  public async RunAllTests(): Promise<string[]> {
    const testList = await this.LoadTests();
    const returnString = [];
    for (const executableGroup of testList) {
      for (const testGroup of executableGroup.children) {
        for (const test of (testGroup as CppUTestGroup).children) {
          const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
          this.onTestStartHandler((test as CppUTest));
          const testReturnString = await runner.RunTest(testGroup.label, test.label);
          this.onTestFinishHandler((test as CppUTest), new TestResult(TestState.Passed, ""));
          returnString.push(testReturnString);
        }
      }
    }
    return returnString;
  }

  public async RunTest(...testId: string[]): Promise<void> {
    const testList = await this.LoadTests();
    for (const executableGroup of testList) {
      for (const testGroup of executableGroup.children) {
        const tests: CppUTest[] = this.GetAllChildTestsById(testId, executableGroup);
        const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
        for (const test of tests) {
          if (test && runner) {
            this.onTestStartHandler((test as CppUTest));
            await runner.RunTest(testGroup.label, test!.label);
            this.onTestFinishHandler((test as CppUTest), new TestResult(TestState.Passed, ""));
          }
        }
      }
    }
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
      const tests: CppUTest[] = this.GetAllChildTestsById(testId, executableGroup);
      const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
      for (const test of tests) {
        if (test && runner) {
          this.onTestStartHandler((test as CppUTest));
          const testRunName = `${test.group}.${test.label}`;
          (config as DebugConfiguration).name = testRunName;
          (config as DebugConfiguration).args = ["-t", testRunName];
          await this.vscodeAdapter.StartDebugger(workspaceFolders, config);
          this.onTestFinishHandler((test as CppUTest), new TestResult(TestState.Passed, ""));
        }
      }
    }
  }

  private GetAllChildTestsById(testId: string[], executableGroup: CppUTestGroup): CppUTest[] {
    const tests: CppUTest[][] = testId.map(id => (executableGroup as CppUTestGroup).FindTest(id));
    return Array<CppUTest>().concat(...tests);
  }

  private EmbedInRunnerGroup(runnerName: string, testString: string): CppUTestGroup | PromiseLike<CppUTestGroup> {
    if (this.suites.has(runnerName)) {
      return (this.suites.get(runnerName) as CppUTestGroup);
    }
    const testFactory = new CppUTestSuite(runnerName);
    const testGroup = testFactory.CreateTestGroupsFromTestListString(testString);
    this.suites.set(runnerName, testGroup);
    return testGroup;
  }
}
