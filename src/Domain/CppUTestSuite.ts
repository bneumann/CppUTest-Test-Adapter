import { CppUTestGroup } from './CppUTestGroup';

export default class CppUTestSuite extends CppUTestGroup {

  constructor(label: string) {
    super(label, label);
  }

  public UpdateFromTestListString(testListString: string): void {
    const groupAndGroupStrings: string[] = testListString.split(" ");
    this.children.splice(0, this.children.length);
    groupAndGroupStrings
      .map(gs => gs.split("."))
      .map(split => this.UpdateGroupAndTest(split[0], split[1]));
  }

  private UpdateGroupAndTest(groupName: string, testName: string): void {
    let testGroup = this.children.find(c => c.label === groupName) as CppUTestGroup;
    if (!testGroup) {
      testGroup = this.AddTestGroup(groupName);
    }
    testGroup.AddTest(testName);
  }
}
