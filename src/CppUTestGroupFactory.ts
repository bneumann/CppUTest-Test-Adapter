import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { CppUTest } from './CppUTest';
import { CppUTestGroup } from './CppUTestGroup';

export default class CppUTestGroupFactory {
  private groupLabel: string;

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

  private CreateGroupAndTests(suite: CppUTestGroup, group: string, test: string): CppUTestGroup {
    let testGroup = suite.children.find(c => c.label === group);
    if (!testGroup) {
      testGroup = new CppUTestGroup(group);
      suite.children.push(testGroup);
    }
    (testGroup as TestSuiteInfo).children.unshift(new CppUTest(test));
    return (testGroup as CppUTestGroup);
  }

  public AddDebugInformationToTest(test: CppUTest, testDebugString: string): void {
    const symbolInformationLines = testDebugString.split("\n");
    const filePath = symbolInformationLines.filter(si => si.startsWith("/"))[0];
    const debugSymbols: string[] = filePath.split(":");
    const file = debugSymbols[0];
    const line = parseInt(debugSymbols[1], 10) - 2; // show it above the test
    test.file = file;
    test.line = line;
  }
}


