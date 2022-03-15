import { CppUTestGroup } from './CppUTestGroup';

export default class CppUTestSuite extends CppUTestGroup {

  constructor(label: string) {
    super(label, label);
  }

  public UpdateFromTestListString(testListString: string, hasLocation: boolean): void {
    if (hasLocation) {
      this.UpdateFromTestListStringWithLocation(testListString);
    } else {
      this.UpdateFromTestListStringWithoutLocation(testListString);
    }
  }

  private UpdateFromTestListStringWithoutLocation(testListString: string): void {
    const groupAndGroupStrings: string[] = testListString.split(" ");
    this.children.splice(0, this.children.length);
    groupAndGroupStrings
      .map(gs => gs.split("."))
      .map(split => this.UpdateGroupAndTest(split[0], split[1], undefined, undefined));
  }

  private UpdateFromTestListStringWithLocation(testListString: string): void {
    const groupAndGroupStrings: string[] = testListString.split("\n").filter(gs => (gs.length > 0));
    this.children.splice(0, this.children.length);
    groupAndGroupStrings
      .map(gs => this.ParseTestInfo(gs))
      .map(split => this.UpdateGroupAndTest(split[0], split[1], split[2], split[3]));
  }

  private UpdateGroupAndTest(groupName: string, testName: string, file: string | undefined, line: string | undefined): void {
    let testGroup = this.children.find(c => c.label === groupName) as CppUTestGroup;
    if (!testGroup) {
      testGroup = this.AddTestGroup(groupName);
    }
    testGroup.AddTest(testName, file, line ? parseInt(line) : undefined);
  }

  private ParseTestInfo(testInfo: string): string[] {
    const firstSeparatorIndex = testInfo.indexOf(".");
    const secondSeparatorIndex = testInfo.indexOf(".", firstSeparatorIndex + 1);
    const lastSeparatorIndex = testInfo.lastIndexOf(".");
    const groupName = testInfo.substring(0, firstSeparatorIndex);
    const testName = testInfo.substring(firstSeparatorIndex + 1, secondSeparatorIndex);
    const file = testInfo.substring(secondSeparatorIndex + 1, lastSeparatorIndex);
    const line = testInfo.substring(lastSeparatorIndex + 1);
    return [groupName, testName, file, line];
  }
}
