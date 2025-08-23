import { expect, use as chaiUse } from 'chai';
import * as chaiAsPromised from "chai-as-promised";
import ExecutableRunner, { RunResultStatus, RunResult } from '../src/Infrastructure/ExecutableRunner';
import { ProcessExecuter } from '../src/Application/ProcessExecuter';
import { anything, instance, mock, verify, when } from "ts-mockito";
import { ExecException } from "child_process";
import { Log } from 'vscode-test-adapter-util';
import { TestLocationFetchMode } from '../src/Infrastructure/Infrastructure';

chaiUse(chaiAsPromised);

const outputStrings = [
  {
    name: "short",
    value: "Group1.Test1.File.Name1.cpp.789\nGroup2.File_name_2.874",
    hasLocation: true
  },
  {
    name: "long",
    value: "Group1.Test1 Group2.Test2 Group2.Test3 Group2.Test4",
    hasLocation: false
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

class ExecError implements ExecException {
  name: string = "";
  message: string = "";
  cmd?: string;
  killed?: boolean;
  code?: number;
  signal?: NodeJS.Signals;
  constructor(code?: number) {
    this.code = code;
  }
}

function createFailingTestString(group: string, test: string): string {
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
      const log = mock<Log>();
      const processExecuter = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(processExecuter, command, log, undefined);

      let testList = await runner.GetTestList(testOutput.hasLocation ? TestLocationFetchMode.TestQuery : TestLocationFetchMode.Disabled);

      expect(testList[0]).to.be.eq(testOutput.value);
      expect(testList[1]).to.be.eq(testOutput.hasLocation);
    })
  })

  it("throw an exception if an error occured", () => {
    const log = mock<Log>();
    const processExecuter = setupMockCalls(new Error("whoops"), "", "Something happened");
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command, log);
    return expect(runner.GetTestList(TestLocationFetchMode.Auto)).to.be.eventually.
      be.rejectedWith("whoops")
      .and.be.an.instanceOf(Error)
  })

  debugStrings.forEach(testOutput => {
    const log = mock<Log>();
    it(`get the debug string for ${testOutput.name}`, async () => {
      const processExecuter = setupMockCalls(undefined, testOutput.value, "");
      const command = "runnable";

      let runner = new ExecutableRunner(processExecuter, command, log);

      let testListString = await runner.GetDebugSymbols("someGroup", "someTest");

      expect(testListString).to.be.eq(testOutput.value);
    })
  })

  it("execute the command in the correct path", async () => {
    const log = mock<Log>();
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

    let runner = new ExecutableRunner(instance(processExecuter), command, log, { "workingDirectory": "/tmp/myPath" });
    await runner.GetTestList(TestLocationFetchMode.Auto);
    expect(calledOptions.cwd).to.be.eq("/tmp/myPath");
  })

  it("return the correct string on successful run", async () => {
    const log = mock<Log>();
    const resultString = createFailingTestString("myGroup", "myTest");
    const processExecuter = setupMockCalls(undefined, resultString, "");
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command, log);

    let actualTestOutput = await runner.RunTest("myGroup", "myTest");

    expect(actualTestOutput).to.be.deep.equal(new RunResult(RunResultStatus.Success, resultString));
  })

  it("return the correct string on run with failure", async () => {
    const log = mock<Log>();
    const errorString = "unexpected failure string";
    const processExecuter = setupMockCalls(new ExecError(1), errorString, "");
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command, log);

    let actualTestOutput = await runner.RunTest("myGroup", "myTest");

    expect(actualTestOutput).to.be.deep.equal(new RunResult(RunResultStatus.Failure, errorString));
  })

  it("return the correct string on run with error", async () => {
    const log = mock<Log>();
    const errorString = "unexpected error string";
    const processExecuter = setupMockCalls(new ExecError(1), "", errorString);
    const command = "runnable";

    let runner = new ExecutableRunner(processExecuter, command, log);

    let actualTestOutput = await runner.RunTest("myGroup", "myTest");

    expect(actualTestOutput).to.be.deep.equal(new RunResult(RunResultStatus.Error, errorString));
  })

  it("kill the process currently running", () => {
    const log = mock<Log>();
    const mockedExecuter = mock<ProcessExecuter>();
    when(mockedExecuter.KillProcess()).thenCall(() => { });
    const executer = instance(mockedExecuter);
    let runner = new ExecutableRunner(executer, "exec", log);
    runner.KillProcess();
    verify(mockedExecuter.KillProcess()).called();
  })

  describe("workingDirectory option", () => {
    it("should use provided workingDirectory option", async () => {
      const log = mock<Log>();
      const mockedExecuter = mock<ProcessExecuter>();
      const customWorkingDir = "/custom/working/directory";
      let capturedOptions: any;

      when(mockedExecuter.ExecFile(anything(), anything(), anything(), anything()))
        .thenCall((cmd: string, args: any, options: any, callback: Function) => {
          capturedOptions = options;
          callback(undefined, "output", "");
        });

      const executer = instance(mockedExecuter);
      const runner = new ExecutableRunner(executer, "/path/to/test.exe", log, 
        { workingDirectory: customWorkingDir });

      await runner.GetTestList(TestLocationFetchMode.Disabled);

      expect(capturedOptions.cwd).to.equal(customWorkingDir);
    });

    it("should use executable directory when workingDirectory not provided", async () => {
      const log = mock<Log>();
      const mockedExecuter = mock<ProcessExecuter>();
      const executablePath = "/path/to/test.exe";
      let capturedOptions: any;

      when(mockedExecuter.ExecFile(anything(), anything(), anything(), anything()))
        .thenCall((cmd: string, args: any, options: any, callback: Function) => {
          capturedOptions = options;
          callback(undefined, "output", "");
        });

      const executer = instance(mockedExecuter);
      const runner = new ExecutableRunner(executer, executablePath, log);

      await runner.GetTestList(TestLocationFetchMode.Disabled);

      expect(capturedOptions.cwd).to.equal("/path/to");
    });

    it("should use workingDirectory for test execution", async () => {
      const log = mock<Log>();
      const mockedExecuter = mock<ProcessExecuter>();
      const customWorkingDir = "/custom/test/directory";
      let capturedOptions: any;

      when(mockedExecuter.ExecFile(anything(), anything(), anything(), anything()))
        .thenCall((cmd: string, args: any, options: any, callback: Function) => {
          capturedOptions = options;
          callback(undefined, ".", "");
        });

      const executer = instance(mockedExecuter);
      const runner = new ExecutableRunner(executer, "/path/to/test.exe", log, 
        { workingDirectory: customWorkingDir });

      await runner.RunTest("TestGroup", "TestName");

      expect(capturedOptions.cwd).to.equal(customWorkingDir);
    });
  });
})

function setupMockCalls(error: ExecException | undefined, returnValue: string, errorValue: string) {
  const mockedExecuter = mock<ProcessExecuter>();
  when(mockedExecuter.Exec(anything(), anything(), anything())).thenCall((cmd: string, options: any, callback: Function) => callback(error, returnValue, errorValue));
  when(mockedExecuter.ExecFile(anything(), anything(), anything(), anything())).thenCall((cmd: string, args: any, options: any, callback: Function) => callback(error, returnValue, errorValue));
  when(mockedExecuter.KillProcess()).thenCall(() => { });
  return instance(mockedExecuter);
}
