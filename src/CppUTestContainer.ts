import { CppUTestGroup } from "./CppUTestGroup";
import CppUTestGroupFactory from "./CppUTestGroupFactory";
import ExecutableRunner from "./ExecutableRunner";

export default class CppUTestContainer {
  private runners: ExecutableRunner[];

  constructor(runners: ExecutableRunner[]) {
    this.runners = runners;
  }

  LoadTests(): Promise<CppUTestGroup>[] {
    return this.runners
      .map(runner => runner.GetTestList()
        .then(testString => this.EmbedInRunnerGroup(runner.Name, testString)));
  }

  private EmbedInRunnerGroup(runnerName: string, testString: string): CppUTestGroup | PromiseLike<CppUTestGroup> {
    const testFactory = new CppUTestGroupFactory(runnerName);
    return testFactory.CreateTestGroupsFromTestListString(testString);
  }
}
