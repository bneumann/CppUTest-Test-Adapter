import { CppUTestGroup } from "./CppUTestGroup";
import CppUTestSuite from "./CppUTestSuite";
import ExecutableRunner from "./ExecutableRunner";

export default class CppUTestContainer {

  private runners: ExecutableRunner[];
  private suites: Map<string, CppUTestGroup>;
  // private dirty: boolean;

  constructor(runners: ExecutableRunner[]) {
    this.runners = runners;
    this.suites = new Map<string, CppUTestGroup>();
  }

  public LoadTests(): Promise<CppUTestGroup[]> {
    return Promise.all(this.runners
      .map(runner => runner.GetTestList()
        .then(testString => this.EmbedInRunnerGroup(runner.Name, testString))));
  }

  public async RunAllTests(): Promise<string[]> {
    const testList = await this.LoadTests();
    const returnString = [];
    for (const executableGroup of testList) {
      for (const testGroup of executableGroup.children) {
        for (const test of (testGroup as CppUTestGroup).children) {
          const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
          returnString.push(await runner.RunTest(testGroup.label, test.label));
        }
      }
    }
    return returnString;
  }

  public async RunTest(id: string): Promise<void> {
    const testList = await this.LoadTests();
    for (const executableGroup of testList) {
      for (const testGroup of executableGroup.children) {
          const test = (testGroup as CppUTestGroup).FindTest(id);
          const runner = this.runners.filter(r => r.Name === executableGroup.label)[0];
          if(test && runner) {
            runner.RunTest(testGroup.label, test.label);
          }
      }
    }
  }

private EmbedInRunnerGroup(runnerName: string, testString: string): CppUTestGroup | PromiseLike<CppUTestGroup> {
    if(this.suites.has(runnerName)) {
      return (this.suites.get(runnerName) as CppUTestGroup);
    }
    const testFactory = new CppUTestSuite(runnerName);
    const testGroup = testFactory.CreateTestGroupsFromTestListString(testString);
    this.suites.set(runnerName, testGroup);
    return testGroup;
  }
}
