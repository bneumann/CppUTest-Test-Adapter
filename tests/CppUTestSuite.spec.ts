import { expect } from 'chai';
import { CppUTestGroup } from '../src/Domain/CppUTestGroup';
import CppUTestSuite from '../src/Domain/CppUTestSuite';

describe('CppUTestSuite should', () => {
  const suite = new CppUTestSuite("Label");

  it('create a TestSuite from an test list string without location', () => {
    const testListString = "Group1.Test1 Group1.Test2 Group2.Test1";
    suite.UpdateFromTestListString(testListString, false);
    expect(suite.label).to.be.equal("Label");
    expect(suite.children.length).to.be.eq(2);
    expect(suite.children[0].label).to.be.equal("Group1");
    expect(suite.children[1].label).to.be.equal("Group2");
    expect((suite.children[0] as CppUTestGroup).children.length).to.be.equal(2);
    expect((suite.children[0] as CppUTestGroup).children[0].label).to.be.equal("Test2");
    expect((suite.children[0] as CppUTestGroup).children[0].file).to.be.equal(undefined);
    expect((suite.children[0] as CppUTestGroup).children[0].line).to.be.equal(undefined);
    expect((suite.children[0] as CppUTestGroup).children[1].label).to.be.equal("Test1");
    expect((suite.children[0] as CppUTestGroup).children[1].file).to.be.equal(undefined);
    expect((suite.children[0] as CppUTestGroup).children[1].line).to.be.equal(undefined);
    expect((suite.children[1] as CppUTestGroup).children.length).to.be.equal(1);
    expect((suite.children[1] as CppUTestGroup).children[0].label).to.be.equal("Test1");
    expect((suite.children[1] as CppUTestGroup).children[0].file).to.be.equal(undefined);
    expect((suite.children[1] as CppUTestGroup).children[0].line).to.be.equal(undefined);
  });

  it('create a TestSuite from an test list string with location', () => {
    const testListString = "Group1.Test1.C:\\File\Name.cpp.345\nGroup1.Test2./path/to.test.file.9873\nGroup2.Test1.Unknown.9889877\n";
    suite.UpdateFromTestListString(testListString, true);
    expect(suite.label).to.be.equal("Label");
    expect(suite.children.length).to.be.eq(2);
    expect(suite.children[0].label).to.be.equal("Group1");
    expect(suite.children[1].label).to.be.equal("Group2");
    expect((suite.children[0] as CppUTestGroup).children.length).to.be.equal(2);
    expect((suite.children[0] as CppUTestGroup).children[0].label).to.be.equal("Test2");
    expect((suite.children[0] as CppUTestGroup).children[0].file).to.be.equal("/path/to.test.file");
    expect((suite.children[0] as CppUTestGroup).children[0].line).to.be.equal(9873);
    expect((suite.children[0] as CppUTestGroup).children[1].label).to.be.equal("Test1");
    expect((suite.children[0] as CppUTestGroup).children[1].file).to.be.equal("C:\\File\Name.cpp");
    expect((suite.children[0] as CppUTestGroup).children[1].line).to.be.equal(345);
    expect((suite.children[1] as CppUTestGroup).children.length).to.be.equal(1);
    expect((suite.children[1] as CppUTestGroup).children[0].label).to.be.equal("Test1");
    expect((suite.children[1] as CppUTestGroup).children[0].file).to.be.equal("Unknown");
    expect((suite.children[1] as CppUTestGroup).children[0].line).to.be.equal(9889877);
  });
});
