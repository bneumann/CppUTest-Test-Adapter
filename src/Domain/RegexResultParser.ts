import { TestResult } from "./TestResult";
import { TestState } from "./TestState";
import { ResultParser } from "./ResultParser";

export class RegexResultParser implements ResultParser {

  public GetResult(resultString: string): TestResult {
    const lines = resultString.split("\n");
    let state: TestState = TestState.Unknown;
    let message = "";
    for (const line of lines) {
      const regexPattern: RegExp = /(\w*)_*TEST\((\w*), (\w*)\)/;
      const match = regexPattern.exec(line);
      if (match !== null) {
        if (match[1] == "IGNORE_") {
          state = TestState.Skipped;
          return new TestResult(state, "");
        } else {
          state = TestState.Passed;
        }
      }
      if (line.includes("Failure in")) {
        state = TestState.Failed;
        continue;
      }
      if (state === TestState.Failed) {
        if (line.trimRight() !== "") {
          message = message.concat(line.trim(), "\n");
        } else {
          return new TestResult(state, message.trim());
        }
      }

    }
    return new TestResult(state, message);
  }
}
