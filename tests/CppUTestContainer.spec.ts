import { expect } from "chai";
import { mock, instance, when, verify, anything, reset, anyString } from "ts-mockito";
import ExecutableRunner from "../src/Infrastructure/ExecutableRunner";
import CppUTestContainer from "../src/Domain/CppUTestContainer";
import { CppUTestGroup } from "../src/Domain/CppUTestGroup";
import { TestResult } from "../src/Domain/TestResult";
import { SettingsProvider } from "../src/Infrastructure/SettingsProvider";
import { VscodeAdapter } from "../src/Infrastructure/VscodeAdapter";
import { DebugConfiguration, WorkspaceFolder } from "vscode";
import { TestState } from "../src/Domain/TestState";
import { ResultParser } from "../src/Domain/ResultParser";
import { TestSuiteInfo } from "../src/Domain/TestSuiteInfo";

describe("CppUTestContainer should", () => {
  let mockRunner: ExecutableRunner;
  let mockSetting: SettingsProvider;
  let mockAdapter: VscodeAdapter;
  let mockResultParser: ResultParser;

  beforeEach(() => {
    mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    mockSetting = mock<SettingsProvider>();
    mockAdapter = mock<VscodeAdapter>();
    mockResultParser = mock<ResultParser>();
    when(mockSetting.GetTestPath()).thenReturn("/test/myPath");
    when(mockSetting.GetTestRunners()).thenReturn(["/test/myPath/Exec1"]);
    when(mockResultParser.GetResult(anything())).thenReturn(new TestResult(TestState.Passed, ""));
  })

  it("load all tests from all testrunners", async () => {
    const mockRunner1 = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    const mockRunner2 = createMockRunner("Exec2", "Group4.Test1 Group5.Test2 Group5.Test42");

    const container = new CppUTestContainer([instance(mockRunner1), instance(mockRunner2)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    expect(allTests).to.be.lengthOf(2);
    expect(allTests[0].label).to.be.eq("Exec1");
    expect(allTests[1].label).to.be.eq("Exec2");
    expect(allTests[0].children[0].label).to.be.eq("Group1");
    expect(allTests[0].children[0]).to.be.instanceOf(CppUTestGroup)
    expect((allTests[0].children[0] as CppUTestGroup).children[0].label).to.be.eq("Test1");

    expect(allTests[1].label).to.be.eq("Exec2");
    expect((allTests[1].children[1] as CppUTestGroup).children[0].label).to.be.eq("Test42");
  })

  it("reload all tests after clear", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));
    const testList1 = await container.LoadTests();
    container.ClearTests()
    const testList2 = await container.LoadTests();
    expect(JSON.stringify(testList1)).to.be.not.eq(JSON.stringify(testList2));
  })

  it("get the same id on consecutive loads", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));
    const testList1 = await container.LoadTests();
    const testList2 = await container.LoadTests();
    expect(JSON.stringify(testList1)).to.be.eq(JSON.stringify(testList2));
  })

  it("run all tests", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    await container.LoadTests();
    await container.RunAllTests();
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run test by id", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    await container.RunTest(testToRun.id);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).never();
  })

  it("run tests by ids", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testsToRun = [
      (allTests[0].children[0] as TestSuiteInfo).children[0],
      (allTests[0].children[1] as TestSuiteInfo).children[0]
    ];
    await container.RunTest(...testsToRun.map(t => t.id));
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run tests by executable group id", async () => {
    const mockRunner1 = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    const mockRunner2 = createMockRunner("Exec2", "Group3.Test1 Group4.Test2");

    const container = new CppUTestContainer([instance(mockRunner1), instance(mockRunner2)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(2);
    const testsToRun = allTests[0];
    await container.RunTest(testsToRun.id);
    verify(mockRunner1.RunTest("Group1", "Test1")).once();
    verify(mockRunner1.RunTest("Group2", "Test2")).once();
    verify(mockRunner2.RunTest(anyString(),anyString())).never();
  })

  it("run tests by group ids", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group1.Test2 Group2.Test2 Group2.Test5");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    expect(allTests[0].children).to.have.lengthOf(2);
    const testsToRunId = allTests[0].children[0].id;

    await container.RunTest(testsToRunId);
    verify(mockRunner.RunTest("Group1", "Test1")).once();
    verify(mockRunner.RunTest("Group1", "Test2")).once();
    verify(mockRunner.RunTest("Group2", "Test2")).never();
    verify(mockRunner.RunTest("Group2", "Test5")).never();
  })

  it("return a TestResult after sucessful run", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group1.Test2");
    when(mockRunner.RunTest(anyString(), anyString())).thenResolve("Success");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    return expect(container.RunTest(testToRun.id)).to.be
      .eventually.fulfilled
      .and.to.have.deep.members([
        { message: "", state: TestState.Passed }
      ])
  })

  it("return a TestResult after failed run", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group1.Test2");
    when(mockRunner.RunTest("Group1", "Test1")).thenResolve("Success");
    when(mockRunner.RunTest("Group1", "Test2")).thenResolve("Failed");
    reset(mockResultParser);
    when(mockResultParser.GetResult("Success")).thenReturn(new TestResult(TestState.Passed, ""));
    when(mockResultParser.GetResult("Failed")).thenReturn(new TestResult(TestState.Failed, "Failed"));
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo);
    return expect(container.RunTest(testToRun.id)).to.be
      .eventually.fulfilled
      .and.to.have.deep.members([
        { message: "", state: TestState.Passed },
        { message: "Failed", state: TestState.Failed }
      ])
  })

  it("start the debugger for the given test", async () => {
    const mockFolder = mock<WorkspaceFolder>();
    const debugConfigSpy = <DebugConfiguration>{
      name: "",
      request: "",
      type: ""
    };
    when(mockSetting.GetWorkspaceFolders()).thenReturn([instance(mockFolder)]);
    when(mockSetting.GetDebugConfiguration()).thenReturn(debugConfigSpy);
    when(mockRunner.Command).thenReturn("myProgram");
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    const testsToRunId = (allTests[0].children[0] as CppUTestGroup).children[0].id;

    await container.DebugTest(testsToRunId);
    verify(mockAdapter.StartDebugger(anything(), anything())).called();
    expect((debugConfigSpy as DebugConfiguration).name).to.be.eq("Group1.Test1");
    expect((debugConfigSpy as DebugConfiguration).args).to.be.deep.eq(["-t", "Group1.Test1"]);
    expect((debugConfigSpy as DebugConfiguration).program).to.be.deep.eq("myProgram");
  })

  it("start the debugger for a given test group", async () => {
    const mockFolder = mock<WorkspaceFolder>();
    const debugConfigSpy = <DebugConfiguration>{
      name: "",
      request: "",
      type: ""
    };
    when(mockSetting.GetWorkspaceFolders()).thenReturn([instance(mockFolder)]);
    when(mockSetting.GetDebugConfiguration()).thenReturn(debugConfigSpy);
    when(mockRunner.Command).thenReturn("myProgram");
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    const testsToRunId = allTests[0].children[0].id;

    await container.DebugTest(testsToRunId);
    verify(mockAdapter.StartDebugger(anything(), anything())).called();
    expect((debugConfigSpy as DebugConfiguration).name).to.be.eq("Group1");
    expect((debugConfigSpy as DebugConfiguration).args).to.be.deep.eq(["-sg", "Group1"]);
    expect((debugConfigSpy as DebugConfiguration).program).to.be.deep.eq("myProgram");
  })

  it("thrown an error if the debugger is started without config", async () => {
    mockSetting = mock<SettingsProvider>();
    when(mockSetting.GetDebugConfiguration()).thenReturn("");
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testsToRunId = allTests[0].id;

    return expect(container.DebugTest(testsToRunId)).to.be.
      eventually.rejectedWith("No debug configuration found. Not able to debug");
  })

  it("thrown an error if the debugger is started without workspaceFolders", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    const allTests = await container.LoadTests();
    const testsToRunId = allTests[0].id;

    return expect(container.DebugTest(testsToRunId)).to.be.
      eventually.rejectedWith("No workspaceFolders found. Not able to debug!");
  })

  it("notify the caller on test start and finish", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));
    const allTests = await container.LoadTests();

    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    let testOnStart = undefined;
    let testOnFinish = undefined;
    let testResultOnFinish: TestResult | undefined = undefined;
    container.OnTestStart = test => testOnStart = test;
    container.OnTestFinish = (test, result) => { testOnFinish = test; testResultOnFinish = result };
    await container.RunTest(testToRun.id);
    expect(testOnStart).to.be.deep.eq(testToRun);
    expect(testOnFinish).to.be.deep.eq(testToRun);
    expect(testResultOnFinish).to.be.not.undefined;
  })

  it("kill the process currently running", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter), instance(mockResultParser));

    container.KillRunningProcesses();
    verify(mockRunner.KillProcess()).called();
  })
});

function createMockRunner(runnerName: string, testListString: string) {
  const mockRunner = mock<ExecutableRunner>();
  when(mockRunner.Name).thenReturn(runnerName);
  when(mockRunner.GetTestList()).thenResolve(testListString);
  return mockRunner;
}
