import * as vscode from 'vscode';
import { execFile, ChildProcess } from 'child_process';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, TestDecoration } from 'vscode-test-adapter-api';
import { CppUTest, CppUTestGroup } from './CppUTestImplementation';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import * as pathModule from 'path';

let suite: CppUTestGroup;
const processes: ChildProcess[] = Array<ChildProcess>();

export function loadTests(): Promise<TestSuiteInfo> {
    const runner = getTestRunner();
    const path = getTestPath();

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
            // This will group all tests in a sub group so they can be run at once
            const subSuite: CppUTestGroup = new CppUTestGroup("Sub Suite");
            suite.children.push(subSuite);
            groups.forEach(g => subSuite.children.push(new CppUTestGroup(g)));
            groupStrings.forEach(gs => subSuite.TestGroups.forEach(tg => tg.addTest(gs)));
            resolve(suite);
        })
    });
    promise.then((suite) => {
        suite.children[0].label = pathModule.basename(runner);
    })
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

export function killTestRun() {
    processes.forEach(p => p.kill("SIGTERM"));
}

export async function debugTest(tests: string[]) {
    const config = getDebugConfiguration();
    if(config === "")
    {
        throw new Error("No debug configuration found. Not able to debug!");
    }
    for (const suiteOrTestId of tests) {
        const node = findNode(suite, suiteOrTestId);
        if (node) {
            console.log(config);
            (config as any).name = node.id;
            const arg: string = node.id.search(/\./) >= 0 ? "-t" : "-sg";
            (config as any).args = [arg, node.id];
            if(vscode.workspace.workspaceFolders)
            {
                await vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], config);
            }
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

        testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node, state: 'running' });

        for (const child of node.children) {
            await runNode(child, testStatesEmitter);
        }

        testStatesEmitter.fire(<TestSuiteEvent>{ type: 'suite', suite: node, state: 'completed' });

    } else { // node.type === 'test'

        testStatesEmitter.fire(<TestEvent>{ type: 'test', test: node, state: 'running' });

        const runner: string = getTestRunner();
        const path: string = getTestPath();
        let group: string, test: string;
        [group, test] = node.id.split(".");
        const command: string = runner ? runner : "";

        const event: TestEvent = await runSingleCall(command, group, test, path);
        testStatesEmitter.fire(event);
    }
}

async function runSingleCall(command: string, group: string, test: string, path: string) {
    const promise: Promise<TestEvent> = new Promise<TestEvent>((resolve, reject) => {
        const runProcess: ChildProcess = execFile(command, ["-sg", group, "-sn", test, "-ojunit"], { cwd: path }, (error: any, stdout, stderr) => {
            if (error && error.code === null) {
                resolve(Promise.resolve(<TestEvent>{ type: 'test', test: suite.findTest(group + "." + test), state: 'errored', message: stderr }));
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
    path: string) {
    const parser: xml2js.Parser = new xml2js.Parser();
    path = path == "" ? "." : path;
    const fileName: string = path + "/cpputest_" + group + ".xml";
    if (!fs.existsSync(fileName)) {
        return Promise.resolve(<TestEvent>{ type: 'test', test: group, state: 'errored', message: "Test crashed" })
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
                if (tc.failure) {
                    state = "failed";
                }
                else if (tc.skipped) {
                    state = "skipped";
                }
                else {
                    state = "passed";
                }
                let message: string = "";
                let decoration: TestDecoration[] | undefined = undefined;
                if (state === "failed") {
                    const failure: any = tc.failure[0].$;
                    message = failure.message.replace(/\{newline\}/g, "\n");
                    decoration = [
                        {
                            line: Number.parseInt(message.split(":")[1]),
                            message: message.split(":")[2]
                        }
                    ];
                }

                const testInfo = new CppUTest(testName, testGroup);
                const path: string = getTestPath();
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

export function getTestRunner(): string {
    const runner: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutable;
    return resolveSettingsVariable(runner);
}

export function getTestPath(): string {
    const path: string | undefined = vscode.workspace.getConfiguration("cpputestExplorer").testExecutablePath;
    return resolveSettingsVariable(path);

}

/**
 * This function converts some of the VSCode variables like workspaceFolder
 * into their correspoing values. This is a workaround for https://github.com/microsoft/vscode/issues/46471
 * @param input Input string from settings.json
 */
function resolveSettingsVariable(input: string | undefined): string {
    if (input) {
        const result: string[] | null = input.match(/\$\{(.*)\}/gmi);
        if (result && result.length > 0) {
            input = input.replace(/(\$\{file\})/gmi, vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath : "");
            input = input.replace(/(\$\{workspaceFolder\})/gmi, vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : "");
        }
        return input;
    }
    else {
        return "";
    }
}

function getDebugConfiguration(): (vscode.DebugConfiguration | string) {
    // Thanks to: https://github.com/matepek/vscode-catch2-test-adapter/blob/9a2e9f5880ef3907d80ff99f3d6d028270923c95/src/Configurations.ts#L125
    if (vscode.workspace.workspaceFolders === undefined) {
        return "";
    }
    const wpLaunchConfigs: string | undefined = vscode.workspace
        .getConfiguration('launch', vscode.workspace.workspaceFolders[0].uri)
        .get<string>('configurations');
    if (wpLaunchConfigs && Array.isArray(wpLaunchConfigs) && wpLaunchConfigs.length > 0) {
        for (let i = 0; i < wpLaunchConfigs.length; ++i) {
            if (IsCCppDebugger(wpLaunchConfigs[i])) {
                const debugConfig: vscode.DebugConfiguration = Object.assign({}, wpLaunchConfigs[i], {
                    program: getTestRunner(),
                    target: getTestRunner()
                });
                return debugConfig;
            }
        }
    }
    return "";
}

function IsCCppDebugger(config: any){
    return config.request == 'launch' &&
        typeof config.type == 'string' &&
        (config.type.startsWith('cpp') ||
         config.type.startsWith('lldb') ||
         config.type.startsWith('gdb'));
}