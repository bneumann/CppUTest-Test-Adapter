import { TestResult } from "./TestResult";
import { TestState } from "./TestState";
import { ResultParser } from "./ResultParser";

export class RegexResultParser implements ResultParser {

  public GetResult(resultString: string): TestResult {
    const regexPattern: RegExp = /(\w*)_*TEST\((\w*), (\w*)\)(.*?)- (\d*) ms/gs;
    const result: RegExpExecArray | null = regexPattern.exec(resultString);
    if (result == null) {
      console.error(`Cannot parse ${resultString} with RegexResultParser`);
      return new TestResult(TestState.Unknown, "");
    }
    else {
      let state: TestState = TestState.Passed;
      const message = result[4].trim();
      if (result[1] == "IGNORE_") {
        state = TestState.Skipped;
      }
      if (message) {
        state = TestState.Failed;
      }
      return new TestResult(state, message);
    }
  }
}
