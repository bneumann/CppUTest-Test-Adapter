import { TestInfo } from "./TestInfo";
import uuid from "./uuid";

export class CppUTest implements TestInfo {
  id: string;
  label: string;
  group: string;
  file?: string | undefined;
  line?: number | undefined;

  constructor(testString: string, group: string, file?: string | undefined, line?: number | undefined) {
    this.id = uuid();
    this.file = file;
    this.line = line;
    this.label = testString;
    this.group = group;
  }
}
