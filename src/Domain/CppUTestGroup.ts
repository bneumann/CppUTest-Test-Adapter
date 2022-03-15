import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { CppUTest } from "./CppUTest";

export class CppUTestGroup implements TestSuiteInfo {
    type: "suite";
    id: string;
    label: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    children: (CppUTest | CppUTestGroup)[];

    constructor(label: string, id: string) {
        this.type = "suite";
        this.id = id;
        this.label = label;
        this.children = new Array<CppUTest | CppUTestGroup>();
    }

    AddTest(testName: string, file?: string, line?: number) {
        const test: CppUTest = new CppUTest(testName, this.label, this.id + "/" + testName, file, line);
        this.children.unshift(test);
    }

    AddTestGroup(groupName: string): CppUTestGroup {
        const testGroup = new CppUTestGroup(groupName, this.id + "/" + groupName);
        this.children.push(testGroup);
        return testGroup;
    }

    FindTest(id: string): CppUTest[] {
        if(this.id === id) {
            return this.Tests;
        }
        return this.Tests.filter(t => t.id === id);
    }

    get Tests(): CppUTest[] {
        const retVal: CppUTest[] = new Array<CppUTest>();
        this.children.forEach(c => {
            if (c instanceof CppUTest) {
                retVal.push(c);
            }
            else {
                retVal.push(...(<CppUTestGroup>c).Tests);
            }
        });
        return retVal;
    }

    get TestGroups(): CppUTestGroup[] {
        const retVal: CppUTestGroup[] = new Array<CppUTestGroup>();
        this.children.forEach(c => {
            if (c instanceof CppUTestGroup) {
                retVal.push(c);
            }
        });
        return retVal;
    }
}
