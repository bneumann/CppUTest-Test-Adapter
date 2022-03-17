import { TestResult } from "./TestResult";
import { TestState } from "./TestState";
import { ResultParser } from "./ResultParser";
import { RunResult, RunResultStatus } from "../Infrastructure/ExecutableRunner";

export class RegexResultParser implements ResultParser {

  public GetResult(resultOutput: RunResult): TestResult {
    switch (resultOutput.Status) {
      case RunResultStatus.Success:
        return this.ParseResultSuccess(resultOutput.Text);
      case RunResultStatus.Failure:
        return this.ParseResultFailure(resultOutput.Text);
      case RunResultStatus.Error:
        return new TestResult(TestState.Failed, resultOutput.Text.trimRight());
    }
  }

  private ParseResultSuccess(resultText: string): TestResult {
    const lines = resultText.split("\n");
    const regexPattern: RegExp = /(\w*)_*TEST\((\w*), (\w*)\)/;
    const match = regexPattern.exec(lines[0]);
    if (match !== null) {
      if (match[1] == "IGNORE_") {
        return new TestResult(TestState.Skipped, "");
      } else {
        return new TestResult(TestState.Passed, "");
      }
    } else {
      const message = lines.slice(1).join("\n");
      return new TestResult(TestState.Unknown, message.trimRight());
    }
  }

  private ParseResultFailure(resultText: string): TestResult {
    const lines = resultText.split("\n");
    let state: TestState = TestState.Unknown;
    let message = "";
    const regexPatternHeading: RegExp = /(\w*)_*TEST\((\w*), (\w*)\)/;
    const match = regexPatternHeading.exec(lines[0]);
    if (match === null) {
      const message = lines.slice(1).join("\n");
      return new TestResult(TestState.Unknown, message.trimRight());
    }
    const regexPatternTail: RegExp = /^\s*-\s\d+\sms\s*$/;
    for (const line of lines.slice(1)) {
      if (line.includes("Failure in")) {
        state = TestState.Failed;
        message = message.concat(line, "\n");
        continue;
      }
      if (state === TestState.Failed) {
        const match = regexPatternTail.exec(line);
        if (match === null) {
          message = message.concat(line, "\n");
        } else {
          return new TestResult(state, message.trimRight());
        }
      }
    }
    return new TestResult(state, message.trimRight());
  }
}
