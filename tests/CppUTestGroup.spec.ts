import { expect } from "chai";
import { CppUTest } from "../src/Domain/CppUTest";
import { CppUTestGroup } from "../src/Domain/CppUTestGroup";

describe("CppUTestGroup should", () => {
  let testGroup: CppUTestGroup;
  beforeEach(() => {
    testGroup = new CppUTestGroup("TestGroup", "TestGroupId");
  })

  it("be creatable with all information", () => {
    expect(testGroup.label).to.be.equal("TestGroup");
    expect(testGroup.id).to.be.equal("TestGroupId");
  })
  it("be able to add tests", () => {
    expect(testGroup.children.length).to.be.eq(0);
    testGroup.AddTest("myTest");
    expect(testGroup.children.length).to.be.eq(1);
  })

  it("find test by id", () => {
    const test = new CppUTest("myTest", "myGroup", "myId");
    const id = test.id;
    testGroup.children.push(test);
    testGroup.AddTest("randomTest1");
    testGroup.AddTest("randomTest2");
    testGroup.AddTest("randomTest3");
    testGroup.AddTest("randomTest4");

    const foundTest = testGroup.FindTest(id);
    expect(foundTest).to.have.lengthOf(1);
    expect(foundTest[0].id).to.be.eq(id);
  })

  it("find all tests that belong to a group", () => {
    testGroup.AddTest("randomTest1");
    testGroup.AddTest("randomTest2");
    testGroup.AddTest("randomTest3");
    testGroup.AddTest("randomTest4");

    const tests = testGroup.FindTest(testGroup.id);

    expect(tests).to.have.lengthOf(4);
    expect(tests).to.be.deep.eq(testGroup.children);
  })

  it("find all tests in nested groups", () => {
    const subTestGroup1 = new CppUTestGroup("subTestGroup1", "subTestGroupId1");
    const subTestGroup2 = new CppUTestGroup("subTestGroup2", "subTestGroupId2");
    testGroup.children.push(subTestGroup1);
    testGroup.children.push(subTestGroup2);
    subTestGroup1.AddTest("test1");
    subTestGroup1.AddTest("test2");
    subTestGroup2.AddTest("test1");
    subTestGroup2.AddTest("test2");

    const tests = testGroup.FindTest(testGroup.id);

    expect(tests).to.have.lengthOf(4);
    expect(tests).to.be.deep.eq(subTestGroup1.children.concat(subTestGroup2.children));
  })
});