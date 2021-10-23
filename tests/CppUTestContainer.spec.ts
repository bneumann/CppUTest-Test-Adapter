import { expect } from "chai";
import { mock, instance, when, verify } from "ts-mockito";
import ExecutableRunner from "../src/Infrastructure/ExecutableRunner";
import CppUTestContainer from "../src/Domain/CppUTestContainer";
import { CppUTestGroup } from "../src/Domain/CppUTestGroup";
import { TestSuiteInfo } from "vscode-test-adapter-api";
import { TestResult } from "../src/Domain/TestResult";

describe("CppUTestContainer should", () => {
  it("load all tests from all testrunners", async () => {
    const mockRunner1 = mock<ExecutableRunner>();
    when(mockRunner1.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");
    when(mockRunner1.Name).thenReturn("Exec1");
    const mockRunner2 = mock<ExecutableRunner>();
    when(mockRunner2.GetTestList()).thenResolve("Group4.Test1 Group5.Test2 Group5.Test42");
    when(mockRunner2.Name).thenReturn("Exec2");

    const container = new CppUTestContainer([instance(mockRunner1), instance(mockRunner2)]);

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
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);
    const testList1 = await container.LoadTests();
    const testList2 = await container.LoadTests();
    expect(JSON.stringify(testList1)).to.be.eq(JSON.stringify(testList2));
  })

  it("run all tests", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);

    await container.LoadTests();
    await container.RunAllTests();
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run test by id", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);

    const allTests = await container.LoadTests();
    const testToRun = (allTests[0].children[0] as TestSuiteInfo).children[0];
    await container.RunTest(testToRun.id);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).never();
  })

  it("run tests by ids", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);

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

    const container = new CppUTestContainer([instance(mockRunner)]);

    const allTests = await container.LoadTests();
    expect(allTests).to.have.lengthOf(1);
    const testsToRunId = allTests[0].id;

    await container.RunTest(testsToRunId);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("notify the caller on test start and finish", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);
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