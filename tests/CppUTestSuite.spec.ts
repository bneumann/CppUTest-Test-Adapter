import { expect } from 'chai';
import { CppUTest } from '../src/Domain/CppUTest';
import { CppUTestGroup } from '../src/Domain/CppUTestGroup';
import CppUTestSuite from '../src/Domain/CppUTestSuite';

const symbolStrings = [
  {
    test: new CppUTest("test1", "group1"),
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "randomly placed line that confuses the analyzer\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    test: new CppUTest("test2", "group1"),
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "randomly placed line that confuses the analyzer\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    test: new CppUTest("test3", "group1"),
    value:
      "/tmp/myPath/basicTests.cpp:56"
  }
];

describe('CppUTestSuite should', () => {
  const parser = new CppUTestSuite("Label");

  it('create a TestSuite from an test list string', () => {
    const testListString = "Group1.Test1 Group1.Test2 Group2.Test1";
    const testSuite = parser.CreateTestGroupsFromTestListString(testListString);
    expect(testSuite.label).to.be.equal("Label");
    expect(testSuite.children.length).to.be.eq(2);
    expect(testSuite.children[0].label).to.be.equal("Group1");
    expect(testSuite.children[1].label).to.be.equal("Group2");
    expect((testSuite.children[0] as CppUTestGroup).children[0].label).to.be.equal("Test2");
  });

  symbolStrings.forEach(symbolString =>
    it(`create debug information from symbol definition string for ${symbolString.test.label}`, () => {
      parser.AddDebugInformationToTest(symbolString.test, symbolString.value);
      expect(symbolString.test.file).to.be.equal("/tmp/myPath/basicTests.cpp");
      expect(symbolString.test.line).to.be.equal(54);
    }))
});
