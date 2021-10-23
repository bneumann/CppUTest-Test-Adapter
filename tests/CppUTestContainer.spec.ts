import { expect } from "chai";
import { mock, instance, when, verify, anything } from "ts-mockito";
import ExecutableRunner from "../src/Infrastructure/ExecutableRunner";
import CppUTestContainer from "../src/Domain/CppUTestContainer";
import { CppUTestGroup } from "../src/Domain/CppUTestGroup";
import { TestSuiteInfo } from "vscode-test-adapter-api";
import { TestResult } from "../src/Domain/TestResult";
import { SettingsProvider } from "../src/Infrastructure/SettingsProvider";
import { VscodeAdapter } from "../src/Infrastructure/VscodeAdapter";
import { DebugConfiguration, WorkspaceFolder } from "vscode";
import { TestState } from "../src/Domain/TestState";

describe("CppUTestContainer should", () => {
  let mockRunner: ExecutableRunner;
  let mockSetting: SettingsProvider;
  let mockAdapter: VscodeAdapter;

  beforeEach(() => {
    mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    mockSetting = mock<SettingsProvider>();
    mockAdapter = mock<VscodeAdapter>();
    when(mockSetting.GetTestPath()).thenReturn("/test/myPath");
    when(mockSetting.GetTestRunners()).thenReturn(["/test/myPath/Exec1"]);
  })

  it("load all tests from all testrunners", async () => {
    const mockRunner1 = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");
    const mockRunner2 = createMockRunner("Exec2", "Group4.Test1 Group5.Test2 Group5.Test42");

    const container = new CppUTestContainer([instance(mockRunner1), instance(mockRunner2)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    expect(allTests).to.be.lengthOf(2);
    expect(allTests[0].label).to.be.eq("Exec1");
    expect(allTests[1].label).to.be.eq("Exec2");
    expect(allTests[0].children[0].label).to.be.eq("Group1");
    expect(allTests[0].children[0].type).to.be.eq("suite");
    expect((allTests[0].children[0] as CppUTestGroup).children[0].label).to.be.eq("Test1");

    expect(allTests[1].label).to.be.eq("Exec2");
    expect((allTests[1].children[1] as CppUTestGroup).children[0].label).to.be.eq("Test42");
  })

  it("get the same id on consecutive loads", async () => {

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));
    const testList1 = await container.LoadTests();
    const testList2 = await container.LoadTests();
    expect(JSON.stringify(testList1)).to.be.eq(JSON.stringify(testList2));
  })

  it("run all tests", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    await container.LoadTests();
    await container.RunAllTests();
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run test by id", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    await container.RunTest(testToRun.id);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).never();
  })

  it("run tests by ids", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    const testsToRun = [
      (allTests[0].children[0] as TestSuiteInfo).children[0],
      (allTests[0].children[1] as TestSuiteInfo).children[0]
    ];
    await container.RunTest(...testsToRun.map(t => t.id));
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run tests by group ids", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    const testsToRunId = allTests[0].id;

    await container.RunTest(testsToRunId);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("return a TestResult after run", async () => {
    const mockRunner = createMockRunner("Exec1", "Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    return expect(container.RunTest(testToRun.id)).to.be
      .eventually.fulfilled
      .and.to.have.deep.members([
        { message: "", state: TestState.Passed },
        { message: "", state: TestState.Passed }
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
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    const testsToRunId = allTests[0].id;

    await container.DebugTest(testsToRunId);
    verify(mockAdapter.StartDebugger(anything(), anything())).called();
    expect((debugConfigSpy as any).name).to.be.eq("Group2.Test2");
    expect((debugConfigSpy as any).args).to.be.deep.eq(["-t", "Group2.Test2"]);
  })

  it("thrown an error if the debugger is started without config", async () => {
    mockSetting = mock<SettingsProvider>();
    when(mockSetting.GetDebugConfiguration()).thenReturn("");
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    const testsToRunId = allTests[0].id;

    return expect(container.DebugTest(testsToRunId)).to.be.
      eventually.rejectedWith("No debug configuration found. Not able to debug");
  })

  it("thrown an error if the debugger is started without workspaceFolders", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));

    const allTests = await container.LoadTests();
    const testsToRunId = allTests[0].id;

    return expect(container.DebugTest(testsToRunId)).to.be.
      eventually.rejectedWith("No workspaceFolders found. Not able to debug!");
  })

  it("notify the caller on test start and finish", async () => {
    const container = new CppUTestContainer([instance(mockRunner)], instance(mockSetting), instance(mockAdapter));
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
});

function createMockRunner(runnerName: string, testListString: string) {
  const mockRunner = mock<ExecutableRunner>();
  when(mockRunner.Name).thenReturn(runnerName);
  when(mockRunner.GetTestList()).thenResolve(testListString);
  return mockRunner;
}
