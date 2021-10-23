import { TestResult } from "./Domain/TestResult";

export interface ResultParser {
  GetResult(resultString: string): TestResult;
}
