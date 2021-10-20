import { expect } from "chai";
import { mock, instance, when, verify } from "ts-mockito";
import ExecutableRunner from "../src/ExecutableRunner";
import CppUTestContainer from "../src/CppUTestContainer";
import { CppUTestGroup } from "../src/CppUTestGroup";

describe("CppUTestContainer should", () => {
  it("Load all tests from all testrunners", async () => {
    const mockRunner1 = mock<ExecutableRunner>();
    when(mockRunner1.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");
    when(mockRunner1.Name).thenReturn("Exec1");
    const mockRunner2 = mock<ExecutableRunner>();
    when(mockRunner2.GetTestList()).thenResolve("Group4.Test1 Group5.Test2 Group5.Test42");
    when(mockRunner2.Name).thenReturn("Exec2");

    const container = new CppUTestContainer([instance(mockRunner1), instance(mockRunner2)]);

    const allTests = await Promise.all(container.LoadTests());
    expect(allTests).to.be.lengthOf(2);
    expect(allTests[0].label).to.be.eq("Exec1");
    expect(allTests[1].label).to.be.eq("Exec2");
    expect(allTests[0].children[0].label).to.be.eq("Group1");
    expect(allTests[0].children[0].type).to.be.eq("suite");
    expect((allTests[0].children[0] as CppUTestGroup).children[0].label).to.be.eq("Test1");

    expect(allTests[1].label).to.be.eq("Exec2");
    expect((allTests[1].children[1] as CppUTestGroup).children[0].label).to.be.eq("Test42");
  })

  it("run all tests", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);

    await Promise.all(container.LoadTests());
    await container.RunAllTests();
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).called();
  })

  it("run test by id", async () => {
    const mockRunner = mock<ExecutableRunner>();
    when(mockRunner.Name).thenReturn("Exec1");
    when(mockRunner.GetTestList()).thenResolve("Group1.Test1 Group2.Test2");

    const container = new CppUTestContainer([instance(mockRunner)]);

    const allTests = await Promise.all(container.LoadTests());
    const testToRun = allTests[0].children[0];
    await container.RunTest(testToRun.id);
    verify(mockRunner.RunTest("Group1", "Test1")).called();
    verify(mockRunner.RunTest("Group2", "Test2")).never();
  })
});