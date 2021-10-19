import { assert, expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from "chai-as-promised";
import ExecutableRunner from '../src/ExecutableRunner';

chaiUse(chaiAsPromised);

const outputStrings = [
  {
    name: "short",
    value: "Group1.Test1 Group2.Test2"
  },
  {
    name: "long",
    value: "Group1.Test1 Group2.Test2 Group2.Test3 Group2.Test4"
  }
]

const debugStrings = [
  {
    name: "short",
    value: "test\nline\nout"
  },
  {
    name: "long",
    value: "test\nline\nout\nthat\nis\nlonger"
  }
]


describe("ExecutableRunner should", () => {

  outputStrings.forEach(testOutput => {
    it(`get the test list string for ${testOutput.name}`, async () => {
      let { mockExec, mockExecFile } = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(mockExec, mockExecFile, command);

      let testListString = await runner.GetTestList();

      expect(testListString).to.be.eq(testOutput.value);
    })
  })

  it("throw an exception if an error occured", async () => {
    let { mockExec, mockExecFile } = setupMockCalls(new Error("whoops"), "", "Something happened");
    const command = "runnable";

    let runner = new ExecutableRunner(mockExec, mockExecFile, command);
    expect(runner.GetTestList()).to.be.eventually.be.rejectedWith(Error);
  })

  debugStrings.forEach(testOutput => {
    it(`get the debug string for ${testOutput.name}`, async () => {
      let { mockExec, mockExecFile } = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(mockExec, mockExecFile, command);

      let testListString = await runner.GetDebugSymbols("someGroup", "someTest");

      expect(testListString).to.be.eq(testOutput.value);
    })
  })

  it("execute the command in the correct path", () => {
    //TODO: Add spy callback to catch if cwd is passed
    assert.fail("path not passed into ExecutableRunner");
  })
})

function setupMockCalls(error: Error | undefined, returnValue: string, errorValue: string) {
  let mockExec = (cmd: string, options: any, callback: Function) => callback(error, returnValue, errorValue);
  let mockExecFile = (cmd: string, args: any, options: any, callback: Function) => callback(error, returnValue, errorValue);
  return { mockExec, mockExecFile };
}
