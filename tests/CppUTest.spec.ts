import { expect } from "chai";
import { CppUTest } from "../src/Domain/CppUTest";

describe("CppUTest should", () => {
  it("be creatable with all information", () => {
    const test = new CppUTest("TestName", "GroupName", "file.cpp", 53);
    expect(test.label).to.be.equal("TestName");
    expect(test.id).to.contain("-");
    expect(test.file).to.be.equal("file.cpp");
    expect(test.line).to.be.equal(53);
  })

  it("be creatable with basic information", () => {
    const test = new CppUTest("TestName", "GroupName");
    expect(test.label).to.be.equal("TestName");
    expect(test.group).to.be.equal("GroupName");
    expect(test.id).to.contain("-");
    expect(test.file).to.be.equal(undefined);
    expect(test.line).to.be.equal(undefined);
  })
});