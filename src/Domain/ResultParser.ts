import { RunResult } from "../Infrastructure/ExecutableRunner";
import { TestResult } from "./TestResult";

export interface ResultParser {
  GetResult(testOutput: RunResult): TestResult;
}
