import * as vscode from 'vscode';
import { exec, execFile, ChildProcess } from 'child_process';
import { TestSuiteInfo, TestInfo, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { CppUTest, CppUTestGroup } from './CppUTestImplementation';
import * as pathModule from 'path';

let suite: CppUTestGroup;
const processes: ChildProcess[] = Array<ChildProcess>();

export function loadTests(): Promise<TestSuiteInfo> {
    const runner = getTestRunner();
    const path = getTestPath();

    const command: string = runner ? runner : "";

    const promise = new Promise<TestSuiteInfo>((resolve, reject) => {
        execFile(command, ["-ln"], { cwd: path }, async (error, stdout, stderr) => {
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

            for (let i: number = 0; i < groupStrings.length; i++) {
                const gs = groupStrings[i];
                for (let j: number = 0; j < subSuite.TestGroups.length; j++) {
                    const tg: CppUTestGroup = subSuite.TestGroups[j];
                    const group = gs.split(".")[0];
                    const test = gs.split(".")[1];
                    const value = await getLineAndFile(command, path, group, test);
                    tg.addTest(gs, value.file, value.line)
                }
            }
            resolve(suite);
        })
    });

    promise.then((suite) => {
        suite.children[0].label = pathModule.basename(runner);
    })
    return Promise.resolve<TestSuiteInfo>(promise);
}

async function getLineAndFile(command: string, path: string, group: string, test: string): Promise<{ file?: string, line?: number }> {
    // Linux:
    const sourceGrep = `objdump -lSd ${command} | grep -m 1 -A 2 TEST_${group}_${test}`;
    // Windows:
    // const sourceGrep = `windObjDumpOrWhatEver ${command} | findstr TEST_${group}_${test}`
    return new Promise<{ file?: string, line?: number }>((resolve, reject) => {
        exec(sourceGrep, { cwd: path }, (error, stdout, stderr) => {
            if (error) {
                console.error('stderr', error.cmd);
                resolve({ file: undefined, line: undefined });
            } else {
                const debugSymbols: string[] = stdout.split("\n")[2].split(":");
                const file = debugSymbols[0];
                const line = parseInt(debugSymbols[1], 10) - 2; // show it above the test
                resolve({ file, line });
            }
        });
    })
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
    if (config === "") {
        throw new Error("No debug configuration found. Not able to debug!");
    }
    for (const suiteOrTestId of tests) {
        const node = findNode(suite, suiteOrTestId);
        if (node) {
            (config as any).name = node.id;
            const arg: string = node.id.search(/\./) >= 0 ? "-t" : "-sg";
            (config as any).args = [arg, node.id];
            if (vscode.workspace.workspaceFolders) {
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
        const runProcess: ChildProcess = execFile(command, ["-sg", group, "-sn", test, "-v"], { cwd: path }, (error: any, stdout, stderr) => {
            if (error && error.code === null) {
                resolve(Promise.resolve(<TestEvent>{ type: 'test', test: suite.findTest(group + "." + test), state: 'errored', message: stderr }));
                return;
            }
            const regexPattern: RegExp = /(\w*)_*TEST\((\w*), (\w*)\)(.*?)- (\d*) ms/gs;
            const result: RegExpExecArray | null = regexPattern.exec(stdout)
            if (result == null) {
                reject({ "reason": "unkown" });
            }
            else {
                let state: TestEvent["state"] = "passed";
                if (result[1] == "IGNORE_") {
                    state = "skipped";
                }
                if(result[4].trim())
                {
                    state = "failed";
                }
                console.log(result);
                const event: TestEvent = {
                    type: 'test',
                    test: new CppUTest(test, group),
                    state: state,
                    message: result[4].trim(),
                    decorations: undefined
                }
                console.log(event);
                resolve(event);
            }
        });
        processes.push(runProcess);
    });
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

function IsCCppDebugger(config: any) {
    const isWin = process.platform === "win32";
    // This is my way of saying: If we are using windows check for a config that has an .exe program.
    const executionExtension: boolean = isWin ? config.program.endsWith(".exe") : true;
    return config.request == 'launch' &&
        typeof config.type == 'string' &&
        executionExtension &&
        (config.type.startsWith('cpp') ||
            config.type.startsWith('lldb') ||
            config.type.startsWith('gdb'));
}