import * as vscode from 'vscode';
import { execFile, ChildProcess } from 'child_process';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestDecoration } from 'vscode-test-adapter-api';
import { CppUTest, CppUTestGroup } from './CppUTestImplementation';
import * as xml2js from 'xml2js';
import * as fs from 'fs';

let suite: CppUTestGroup;
const processes: ChildProcess[] = Array<ChildProcess>();

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
            suite = new CppUTestGroup("CppuTest Suite");
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

export function killTestRun() 
{
    processes.forEach(p => p.kill("SIGTERM"));
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

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node, state: 'running' });

		for (const child of node.children) {
			await runNode(child, testStatesEmitter);
		}

		testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node, state: 'completed' });

	} else { // node.type === 'test'

		testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node, state: 'running' });

        const runner: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutable;
        const path: string = vscode.workspace.getConfiguration("cpputestExplorer").testExecutablePath;
        let group: string, test: string;
        [group, test] = node.id.split(".");        
        const command: string = runner ? runner : "";
        
        const event: TestEvent = await runSingleCall(command, group, test, path);
        testStatesEmitter.fire(event);
	}
}

async function runSingleCall(command: string, group: string, test: string, path: string)
{
    const promise: Promise<TestEvent> = new Promise<TestEvent>((resolve, reject) => {
        const runProcess: ChildProcess = execFile(command, ["-sg", group, "-sn", test, "-ojunit"], { cwd: path },  (error: any, stdout, stderr) => {
            if (error && error.code === null) {
                resolve(Promise.resolve(<TestEvent>{type: 'test', test: suite.findTest(group+"."+test), state: 'errored', message: stderr }));
                return;
            }
            resolve(evaluateXML(group, path));            
        });
        processes.push(runProcess);
    });
    return Promise.resolve(promise);
}

async function evaluateXML(
    group: string,
    path: string)
{
    const parser: xml2js.Parser = new xml2js.Parser();
    const fileName: string = path + "/cpputest_" + group + ".xml";
    if(!fs.existsSync(fileName))
    {
        return Promise.resolve(<TestEvent>{type: 'test', test: group, state: 'errored', message: "Test crashed" })
    }
    const xml: Buffer = fs.readFileSync(fileName);
    const promise: Promise<TestEvent> = new Promise<TestEvent>((resolve, reject) => {
        parser.parseString(xml, function (err: string, result: any) {
            if (err) {
                reject(err);
            } else {
                const tc: any = result.testsuite.testcase[0];
                const testName: string = tc.$.name;
                const testGroup: string = tc.$.classname;
                const testFile: string = tc.$.file;
                const testLine: number = Number.parseInt(tc.$.line);
                let state: TestEvent["state"];
                if(tc.failure) 
                {
                    state = "failed";
                }
                else if(tc.skipped)
                {
                    state = "skipped";
                }
                else
                {
                    state = "passed";
                } 
                let message: string = "";
                let decoration: TestDecoration[] | undefined = undefined;
                if(state === "failed")
                {
                    const failure: any = tc.failure[0].$;
                    message = failure.message;                    
                    decoration = [
                        {
                            line: Number.parseInt(message.split(":")[1]),
                            message: message.split(":")[2]
                        }
                    ];
                }

                const testInfo = new CppUTest(testName, testGroup);
                const path: string = vscode.workspace.getConfiguration("cpputestExplorer").testExecutablePath;
                testInfo.file = path + testFile;
                testInfo.line = testLine;
                suite.updateTest(testInfo);
                const event: TestEvent = {
                    type: 'test',
                    test: testInfo,
                    state: state,
                    message: message,
                    decorations: decoration
                }
                resolve(event);
            }
        });
    })
    return Promise.resolve(promise);
}