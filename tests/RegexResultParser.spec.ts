// import { instance, mock } from "ts-mockito";

import { expect } from "chai";
import { readFileSync } from "fs";
import { RegexResultParser } from "../src/RegexResultParser";
import { TestResult } from "../src/TestResult";
import { TestState } from "../src/TestState";

const allTests: { name: string, value: string[], expected: string[] }[] = JSON.parse(readFileSync("tests/testResults.json").toString());

describe("RegexResultParser should", () => {
  allTests.filter(t => t.name.startsWith("failing")).forEach(failingTest => {
    it(`return failed result for '${failingTest.name}''`, () => {
      const resultParser = new RegexResultParser();

      const expectedTestResult = new TestResult(TestState.Failed, failingTest.expected.join("\n"));
      const stringFromRunner = failingTest.value.join("\n");
      expect(resultParser.GetResult(stringFromRunner)).to.be.deep.eq(expectedTestResult);
    })
  })

  allTests.filter(t => t.name.startsWith("passing")).forEach(failingTest => {
    it(`return passing result for '${failingTest.name}''`, () => {
      const resultParser = new RegexResultParser();

      const expectedTestResult = new TestResult(TestState.Passed, failingTest.expected.join("\n"));
      const stringFromRunner = failingTest.value.join("\n");
      expect(resultParser.GetResult(stringFromRunner)).to.be.deep.eq(expectedTestResult);
    })
  })

  allTests.filter(t => t.name.startsWith("ignored")).forEach(failingTest => {
    it(`return skipped result for '${failingTest.name}''`, () => {
      const resultParser = new RegexResultParser();

      const expectedTestResult = new TestResult(TestState.Skipped, failingTest.expected.join("\n"));
      const stringFromRunner = failingTest.value.join("\n");
      expect(resultParser.GetResult(stringFromRunner)).to.be.deep.eq(expectedTestResult);
    })
  })
});