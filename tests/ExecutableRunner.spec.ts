import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from "chai-as-promised";
import ExecutableRunner from '../src/Infrastructure/ExecutableRunner';
import { ProcessExecuter } from '../src/Application/ProcessExecuter';
import { anything, instance, mock, verify, when } from "ts-mockito";

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

const createFailingTestString = (group: string, test: string): string => {
  return `TEST(${group}, ${test})\n` +
    `/home/user/test/myTests/.cpp(58): error: Failure in TEST(${group}, ${test})\n` +
    "Message: This is failing\n" +
    "CHECK(false) failed\n\n" +
    "- 4 ms\n\n" +
    "Errors (1 failures, 9 tests, 1 ran, 1 checks, 0 ignored, 8 filtered out, 6 ms)";
}

describe("ExecutableRunner should", () => {
  outputStrings.forEach(testOutput => {
    it(`get the test list string for ${testOutput.name}`, async () => {
      const processExecuter = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(processExecuter, command);

      let testListString = await runner.GetTestList();

      expect(testListString).to.be.eq(testOutput.value);
    })
  })

  it("throw an exception if an error occured", async () => {
    const processExecuter = setupMockCalls(new Error("whoops"), "", "Something happened");
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command);
    expect(runner.GetTestList()).to.be.eventually.be.rejectedWith(Error);
  })

  debugStrings.forEach(testOutput => {
    it(`get the debug string for ${testOutput.name}`, async () => {
      const processExecuter = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(processExecuter, command);

      let testListString = await runner.GetDebugSymbols("someGroup", "someTest");

      expect(testListString).to.be.eq(testOutput.value);
    })
  })

  it("execute the command in the correct path", async () => {
    const command = "runnable";
    let calledOptions: any = {};
    const processExecuter = mock<ProcessExecuter>();

    when(processExecuter.Exec(anything(), anything(), anything())).thenCall((cmd: string, options: any, callback: Function) => {
      calledOptions = options;
      callback(undefined, "Group1.Test1", undefined);
    });

    when(processExecuter.ExecFile(anything(), anything(), anything(), anything())).thenCall((cmd: string, args: any, options: any, callback: Function) => {
      calledOptions = options;
      callback(undefined, "Group1.Test1", undefined);
    });

    let runner = new ExecutableRunner(instance(processExecuter), command, "/tmp/myPath");
    await runner.GetTestList();
    expect(calledOptions.cwd).to.be.eq("/tmp/myPath");
  })

  it("return the correct string on run", async () => {
    const resultString = createFailingTestString("myGroup", "myTest");
    const processExecuter = setupMockCalls(undefined, resultString, "");
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command);

    let actualResultString = await runner.RunTest("myGroup", "myTest");

    expect(actualResultString).to.be.eq(resultString);
  })

  it("kill the process currently running", () => {
    const mockedExecuter = mock<ProcessExecuter>();
    when(mockedExecuter.KillProcess()).thenCall(() => { });
    const executer = instance(mockedExecuter);
    let runner = new ExecutableRunner(executer, "exec");
    runner.KillProcess();
    verify(mockedExecuter.KillProcess()).called();
  })
})

function setupMockCalls(error: Error | undefined, returnValue: string, errorValue: string) {
  const mockedExecuter = mock<ProcessExecuter>();
  when(mockedExecuter.Exec(anything(), anything(), anything())).thenCall((cmd: string, options: any, callback: Function) => callback(error, returnValue, errorValue));
  when(mockedExecuter.ExecFile(anything(), anything(), anything(), anything())).thenCall((cmd: string, args: any, options: any, callback: Function) => callback(error, returnValue, errorValue));
  when(mockedExecuter.KillProcess()).thenCall(() => { });
  return instance(mockedExecuter);
}
