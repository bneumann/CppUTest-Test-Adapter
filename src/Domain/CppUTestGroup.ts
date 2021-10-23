import { TestSuiteInfo, TestInfo } from 'vscode-test-adapter-api';
import { CppUTest } from "./CppUTest";
import uuid from './uuid';


export class CppUTestGroup implements TestSuiteInfo {
    type: "suite";
    id: string;
    label: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    children: (TestSuiteInfo | TestInfo)[];
    executable: string | undefined;

    constructor(inputString: string, executable: string | undefined = undefined) {
        this.type = "suite";
        this.id = uuid();
        this.label = inputString;
        this.children = new Array<CppUTest | CppUTestGroup>();
        this.executable = executable;
    }

    AddTest(testName: string, file?: string, line?: number) {
        const test: CppUTest = new CppUTest(testName, this.label, file, line);
        this.children.unshift(test);
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
