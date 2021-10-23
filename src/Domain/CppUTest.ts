import { TestInfo } from "vscode-test-adapter-api";
import uuid from "./uuid";

export class CppUTest implements TestInfo {
  type: "test" = "test";
  id: string;
  label: string;
  description?: string | undefined;
  tooltip?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
  skipped?: boolean | undefined;

  constructor(testString: string, file?: string | undefined, line?: number | undefined) {
      this.id = uuid();
      this.file = file;
      this.line = line;
      this.label = testString;
  }
}
