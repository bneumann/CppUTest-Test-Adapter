import { expect } from "chai";
import { CppUTest } from "../src/Domain/CppUTest";

const symbolStrings = [
  {
    test: new CppUTest("test1", "group1", "id1"),
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "randomly placed line that confuses the analyzer\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    test: new CppUTest("test2", "group1", "id2"),
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "randomly placed line that confuses the analyzer\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    test: new CppUTest("test3", "group1", "id3"),
    value:
      "/tmp/myPath/basicTests.cpp:56"
  }
];

describe("CppUTest should", () => {
  it("be creatable with all information", () => {
    const test = new CppUTest("TestName", "GroupName", "TestName/GroupName", "file.cpp", 53);
    expect(test.label).to.be.equal("TestName");
    expect(test.id).to.be.equal("TestName/GroupName");
    expect(test.file).to.be.equal("file.cpp");
    expect(test.line).to.be.equal(53);
  })

  it("be creatable with basic information", () => {
    const test = new CppUTest("TestName", "GroupName", "TestName/GroupName");
    expect(test.label).to.be.equal("TestName");
    expect(test.group).to.be.equal("GroupName");
    expect(test.id).to.contain("TestName/GroupName");
    expect(test.file).to.be.equal(undefined);
    expect(test.line).to.be.equal(undefined);
  })

  symbolStrings.forEach(symbolString =>
    it(`create debug information from symbol definition string for ${symbolString.test.label}`, () => {
      symbolString.test.AddDebugInformation(symbolString.value);
      expect(symbolString.test.file).to.be.equal("/tmp/myPath/basicTests.cpp");
      expect(symbolString.test.line).to.be.equal(56);
    })
  )
});