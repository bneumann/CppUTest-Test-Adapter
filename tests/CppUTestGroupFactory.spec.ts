import { expect } from 'chai';
import { CppUTestGroup } from '../src/CppUTestImplementation';
import { CppUTestGroupFactory } from '../src/CppUTestGroupFactory';

const symbolStrings = [
  {
    name: "test1",
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "randomly placed line that confuses the analyzer\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    name: "test2",
    value:
      "_ZN31TEST_Group1_Test1_TestShellC4Ev():\n" +
      "randomly placed line that confuses the analyzer\n" +
      "/tmp/myPath/basicTests.cpp:56\n" +
      "TEST(Group1, Test1)\n" +
      "random information that is not correlated at all"
  },
  {
    name: "test3",
    value:
      "/tmp/myPath/basicTests.cpp:56"
  }
];

describe('CppUTestGroupFactory should', () => {
  const parser = new CppUTestGroupFactory("Label");

  it('create a TestSuite from an test list string', () => {
    const testListString = "Group1.Test1 Group1.Test2 Group2.Test1";
    const testSuite = parser.CreateSuiteFromTestListString(testListString);
    expect(testSuite.label).to.be.equal("Label");
    expect(testSuite.children[0].label).to.be.equal("Group1");
    expect(testSuite.children[1].label).to.be.equal("Group2");
    expect((testSuite.children[0] as CppUTestGroup).children[0].label).to.be.equal("Test2");
  });

  symbolStrings.forEach(symbolString =>
    it(`create debug information from symbol definition string for ${symbolString.name}`, () => {
      const debugInformation = parser.CreateDebugInformationFromString(symbolString.value);
      expect(debugInformation.file).to.be.equal("/tmp/myPath/basicTests.cpp");
      expect(debugInformation.line).to.be.equal(54);
    }))
});