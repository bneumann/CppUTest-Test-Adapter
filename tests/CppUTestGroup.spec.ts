import { expect } from "chai";
import { CppUTest } from "../src/CppUTest";
import { CppUTestGroup } from "../src/CppUTestGroup";

describe("CppUTestGroup should", () => {
  const testGroup = new CppUTestGroup("TestName");

  it("be creatable with all information", () => {
    expect(testGroup.label).to.be.equal("TestName");
    expect(testGroup.id).to.contain("-");
  })
  it("be able to add tests", () => {
    expect(testGroup.children.length).to.be.eq(0);
    testGroup.AddTest("myTest");
    expect(testGroup.children.length).to.be.eq(1);
  })

  it("find test by id", () => {
    const test = new CppUTest("myTest");
    const id = test.id;
    testGroup.children.push(test);
    testGroup.AddTest("randomTest1");
    testGroup.AddTest("randomTest2");
    testGroup.AddTest("randomTest3");
    testGroup.AddTest("randomTest4");

    const foundTest = testGroup.FindTest(id);
    expect(foundTest?.id).to.be.eq(id);
  })
});