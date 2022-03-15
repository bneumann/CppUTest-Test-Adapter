import { TestInfo } from "vscode-test-adapter-api";

export class CppUTest implements TestInfo {
  type: "test" = "test";
  id: string;
  label: string;
  group: string;
  description?: string | undefined;
  tooltip?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
  skipped?: boolean | undefined;

  constructor(testString: string, group: string, id: string, file?: string | undefined, line?: number | undefined) {
    this.id = id;
    this.file = file;
    this.line = line;
    this.label = testString;
    this.group = group;
  }

  public AddDebugInformation(testDebugString: string): void {
    const symbolInformationLines = testDebugString.split("\n");
    const filePath = symbolInformationLines.filter(si => si.startsWith("/"))[0];
    const debugSymbols: string[] = filePath.split(":");
    const file = debugSymbols[0];
    const line = parseInt(debugSymbols[1], 10);
    this.file = file;
    this.line = line;
  }
}
