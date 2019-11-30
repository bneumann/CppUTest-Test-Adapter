import { TestSuiteInfo, TestInfo } from 'vscode-test-adapter-api';

export class CppUTestGroup implements TestSuiteInfo 
{
    type: "suite";
    id: string;
    label: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    children: (TestSuiteInfo | TestInfo)[];

    constructor(inputString: string)
    {
        this.type = "suite";
        this.id = inputString;
        this.label = inputString;
        this.children = new Array<CppUTest | CppUTestGroup>();
    }

    addTest(inputString: string)
    {
        if(inputString.indexOf("."))
        {
            const stringSplit = inputString.split(".");
            if(stringSplit[0] === this.label)
            {
                this.children.push(new CppUTest(stringSplit[1], stringSplit[0]));
            }
        }
    }

    findTest(label: string): CppUTest | undefined
    {
        if(label.indexOf("."))
        {
            return this.Tests.find(t => t.id === label)
        }
        return undefined;
    }

    updateTest(test: CppUTest)
    {
        let oldTest: CppUTest | undefined = this.findTest(test.label);
        if(oldTest)
        {
            oldTest = test;
        }
    }

    get Tests(): CppUTest[]
    {
        const retVal: CppUTest[] = new Array<CppUTest>();
        this.children.forEach(c => {
            if(c instanceof CppUTest){
                retVal.push(c);
            } 
            else
            {
                retVal.push(...(<CppUTestGroup>c).Tests);
            }
        })
        return retVal;
    }

    get TestGroups(): CppUTestGroup[]
    {
        const retVal: CppUTestGroup[] = new Array<CppUTestGroup>();
        this.children.forEach(c => {
            if(c instanceof CppUTestGroup){
                retVal.push(c);
            }
        })
        return retVal;
    }
}

export class CppUTest implements TestInfo
{
    type: "test";    
    id: string;
    label: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    skipped?: boolean | undefined;

    
    constructor(testString: string, groupString: string)
    {
        this.type = "test";
        this.id = groupString + "." + testString;
        this.label = testString;
    }  
}
