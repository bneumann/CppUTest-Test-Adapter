import { CppUTestGroup } from './CppUTestImplementation';
import { DebugInformation } from "./DebugInformation";

export class CppUTestGroupFactory {
  private groupLabel: string;

  constructor(groupLabel: string) {
    this.groupLabel = groupLabel;
  }

  CreateSuiteFromTestListString(testListString: string) {
    const groupStrings: string[] = testListString.split(" ");
    const groups = [...new Set(groupStrings.map(gs => gs.split(".")[0]))];
    // This will group all tests in a sub group so they can be run at once
    const subSuite: CppUTestGroup = new CppUTestGroup(this.groupLabel);
    groups.forEach(g => subSuite.children.push(new CppUTestGroup(g)));

    for (let i: number = 0; i < groupStrings.length; i++) {
      const gs = groupStrings[i];
      for (let j: number = 0; j < subSuite.TestGroups.length; j++) {
        const tg: CppUTestGroup = subSuite.TestGroups[j];
        // const group = gs.split(".")[0];
        // const test = gs.split(".")[1];
        // const value = await getLineAndFile(command, path, group, test);
        tg.addTest(gs);
      }
    }
    return subSuite;
  }

  CreateDebugInformationFromString(debugString: string): DebugInformation {
    const symbolInformationLines = debugString.split("\n");
    const filePath = symbolInformationLines.filter(si => si.startsWith("/"))[0];
    const debugSymbols: string[] = filePath.split(":");
    const file = debugSymbols[0];
    const line = parseInt(debugSymbols[1], 10) - 2; // show it above the test
    return new DebugInformation(file, line);
  }
}
