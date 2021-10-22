import { TestState } from "./TestState";

export class TestResult {
  public readonly message: string;
  public readonly state: TestState;

  constructor(state: TestState, message: string) {
    this.state = state;
    this.message = message;
  }
}
