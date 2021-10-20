import { CppUTestGroup } from "./CppUTestGroup";
import CppUTestGroupFactory from "./CppUTestGroupFactory";
import ExecutableRunner from "./ExecutableRunner";

export default class CppUTestContainer {

  private runners: ExecutableRunner[];

  constructor(runners: ExecutableRunner[]) {
    this.runners = runners;
  }

  public LoadTests(): Promise<CppUTestGroup>[] {
    return this.runners
      .map(runner => runner.GetTestList()
        .then(testString => this.EmbedInRunnerGroup(runner.Name, testString)));
  }

  public async RunAllTests(): Promise<string[]> {
    const testList = await Promise.all(this.LoadTests());
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

  public async RunTest(id: string): Promise<string> {
    throw new Error("Method not implemented.");
  }

  private EmbedInRunnerGroup(runnerName: string, testString: string): CppUTestGroup | PromiseLike<CppUTestGroup> {
    const testFactory = new CppUTestGroupFactory(runnerName);
    return testFactory.CreateTestGroupsFromTestListString(testString);
  }
}
