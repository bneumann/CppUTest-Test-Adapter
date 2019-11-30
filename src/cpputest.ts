import * as vscode from 'vscode';
import { execFile } from 'child_process';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';

export function loadTests(): Promise<TestSuiteInfo> {
    const runner: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutable;
    const path: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutablePath;

    const command: string = runner ? runner : "";

    const promise = new Promise<TestSuiteInfo>((resolve, reject) => {
        execFile(command, ["-ln"], { cwd: path }, (error, stdout, stderr) => {
            if (error) {
                console.error('stderr', stderr);
                reject(error);
            }
            const groupStrings: string[] = stdout.split(" ");
            const groups = [...new Set(groupStrings.map(gs => gs.split(".")[0]))];            
            groups.forEach(g => suite.children.push(new CppUTestGroup(g)));
            groupStrings.forEach(gs => suite.TestGroups.forEach(tg => tg.addTest(gs)));
            resolve(suite);
        })
    });
    return Promise.resolve<TestSuiteInfo>(promise);
}

export async function runTests(
	tests: string[],
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {
	for (const suiteOrTestId of tests) {
		const node = findNode(suite, suiteOrTestId);
		if (node) {
			await runNode(node, testStatesEmitter);
		}
	}
}

function findNode(searchNode: TestSuiteInfo | TestInfo, id: string): TestSuiteInfo | TestInfo | undefined {
	if (searchNode.id === id) {
		return searchNode;
	} else if (searchNode.type === 'suite') {
		for (const child of searchNode.children) {
			const found = findNode(child, id);
			if (found) return found;
		}
	}
	return undefined;
}

async function runNode(
	node: TestSuiteInfo | TestInfo,
	testStatesEmitter: vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>
): Promise<void> {

	if (node.type === 'suite') {

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'running' });

		for (const child of node.children) {
			await runNode(child, testStatesEmitter);
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node.id, state: 'completed' });

	} else { // node.type === 'test'

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'running' });

        const runner: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutable;
        const path: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutablePath;
    
        const command: string = runner ? runner : "";
    
        execFile(command, ["-ln"], { cwd: path }, (error, stdout, stderr) => {
            if (error) {
                console.error('stderr', stderr);
            }            
        });

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node.id, state: 'passed' });

	}
}


class CppUTestGroup implements TestSuiteInfo 
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
        this.children = new Array<CppuTest | CppUTestGroup>();
    }

    addTest(inputString: string)
    {
        if(inputString.indexOf("."))
        {
            const stringSplit = inputString.split(".");
            if(stringSplit[0] === this.label)
            {
                this.children.push(new CppuTest(stringSplit[1]));
            }
        }
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

class CppuTest implements TestInfo
{
    type: "test";    
    id: string;
    label: string;
    description?: string | undefined;
    tooltip?: string | undefined;
    file?: string | undefined;
    line?: number | undefined;
    skipped?: boolean | undefined;

    
    constructor(inputString: string)
    {
        this.type = "test";
        this.id = inputString;
        this.label = inputString;
    }  
}

const suite: CppUTestGroup = new CppUTestGroup("CppuTest Suite");