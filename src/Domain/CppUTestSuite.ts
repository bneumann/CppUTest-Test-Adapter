import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { CppUTest } from './CppUTest';
import { CppUTestGroup } from './CppUTestGroup';

export default class CppUTestSuite {
  private readonly groupLabel: string;

  constructor(groupLabel: string) {
    this.groupLabel = groupLabel;
  }

  public CreateTestGroupsFromTestListString(testListString: string) {
    const groupStrings: string[] = testListString.split(" ");
    const subSuite: CppUTestGroup = new CppUTestGroup(this.groupLabel);
    groupStrings
      .map(gs => gs.split("."))
      .forEach(split => this.CreateGroupAndTests(subSuite, split[0], split[1]));

    return subSuite;
  }

  private CreateGroupAndTests(suite: CppUTestGroup, groupName: string, testName: string): CppUTestGroup {
    let testGroup = suite.children.find(c => c.label === groupName);
    if (!testGroup) {
      testGroup = new CppUTestGroup(groupName);
      suite.children.push(testGroup);
    }
    const test = new CppUTest(testName, groupName);
    (testGroup as TestSuiteInfo).children.unshift(test);
    return (testGroup as CppUTestGroup);
  }

  public AddDebugInformationToTest(test: CppUTest, testDebugString: string): void {
    const symbolInformationLines = testDebugString.split("\n");
    const filePath = symbolInformationLines.filter(si => si.startsWith("/"))[0];
    const debugSymbols: string[] = filePath.split(":");
    const file = debugSymbols[0];
    const line = parseInt(debugSymbols[1], 10);
    test.file = file;
    test.line = line;
  }
}


