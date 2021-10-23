import { TestResult } from "./TestResult";

export interface ResultParser {
  GetResult(resultString: string): TestResult;
}
