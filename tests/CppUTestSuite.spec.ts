import { expect } from 'chai';
import { CppUTestGroup } from '../src/Domain/CppUTestGroup';
import CppUTestSuite from '../src/Domain/CppUTestSuite';

describe('CppUTestSuite should', () => {
  const suite = new CppUTestSuite("Label");

  it('create a TestSuite from an test list string', () => {
    const testListString = "Group1.Test1 Group1.Test2 Group2.Test1";
    suite.UpdateFromTestListString(testListString);
    expect(suite.label).to.be.equal("Label");
    expect(suite.children.length).to.be.eq(2);
    expect(suite.children[0].label).to.be.equal("Group1");
    expect(suite.children[1].label).to.be.equal("Group2");
    expect((suite.children[0] as CppUTestGroup).children[0].label).to.be.equal("Test2");
  });
});
