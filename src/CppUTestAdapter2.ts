import * as vscode from 'vscode';
import CppUTestContainer from "./Domain/CppUTestContainer";
import { CppUTestGroup } from './Domain/CppUTestGroup';
import { RegexResultParser } from "./Domain/RegexResultParser";
import VscodeSettingsProvider from "./Infrastructure/VscodeSettingsProvider";
import ExecutableRunner from "./Infrastructure/ExecutableRunner";
import { NodeProcessExecuter } from './Application/NodeProcessExecuter';
import { VscodeAdapterImplementation } from "./Application/VscodeAdapterImplementation";
import { VscodeLogger } from "./Application/VscodeLogger";
import { TestState } from './Domain/TestState';
import { CppUTest } from './Domain/CppUTest';
import { TestResult } from './Domain/TestResult';

export class CppUTestAdapter2 {
    private controller: vscode.TestController;
    private log: VscodeLogger = VscodeLogger.Instance;
    private root: CppUTestContainer;
    private mainSuite: CppUTestGroup;
    public get Controller(): vscode.TestController { return this.controller };

    public constructor() {
        VscodeLogger.Instance.SetLogger(vscode.window.createOutputChannel("CppUTest Adapter"));
        this.controller = vscode.tests.createTestController(
            'cppuTestAdapter',
            'CppUTest AdapterTests'
        );
        this.SetupProfiles();
        const settingsProvider = new VscodeSettingsProvider(vscode.workspace.getConfiguration("cpputestExplorer"));
        const processExecuter = new NodeProcessExecuter();
        const vscodeAdapter = new VscodeAdapterImplementation();
        const runners = settingsProvider.GetTestRunners().map(runner => new ExecutableRunner(processExecuter, runner));
        const resultParser = new RegexResultParser();

        this.root = new CppUTestContainer(runners, settingsProvider, vscodeAdapter, resultParser);
        this.mainSuite = new CppUTestGroup("Main Suite");
        this.root.OnTestFinish = this.handleTestFinished.bind(this);

        this.controller.resolveHandler = this.discoverTests.bind(this);
        (this.controller as any).refreshHandler = this.discoverTests.bind(this);
    }

    private SetupProfiles() {
        this.controller.createRunProfile(
            "Run",
            vscode.TestRunProfileKind.Run,
            (request, token) => {
                this.runHandler(request, token);
            }
        );

        this.controller.createRunProfile(
            "Debug",
            vscode.TestRunProfileKind.Debug,
            (request, token) => {
                this.debugHandler(request, token);
            }
        );
    }

    private async runHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
        const run = this.controller.createTestRun(request);
        const queue: vscode.TestItem[] = [];

        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            this.controller.items.forEach(test => queue.push(test));
        }
        this.lastTestResults = {};
        while (queue.length > 0 && !token.isCancellationRequested) {
            const test = queue.pop()!;
            const start = Date.now();

            run.started(test);
            await this.root.RunTest(test.id);
            const duration = Date.now() - start;

            for (const testId in this.lastTestResults) {
                const testItem = this.allTestItems.find(ti => ti.id == testId);
                const result = this.lastTestResults[testId];
                if (testItem) {
                    switch (result.state) {
                        case TestState.Passed:
                            run.passed(testItem, duration)
                            break;
                        case TestState.Failed:
                            run.failed(testItem, new vscode.TestMessage(result.message), duration);
                            break;
                        case TestState.Skipped:
                            run.skipped(testItem);
                            break;
                        case TestState.Errored:
                        case TestState.Unknown:
                            run.errored(testItem, new vscode.TestMessage(result.message), duration);
                            break;
                    }
                }
                run.appendOutput(result.message);
            }
        }
        run.end();
    }
    private debugHandler(request: vscode.TestRunRequest, token: vscode.CancellationToken) {
        VscodeLogger.Instance.info(request as any);
    }

    private lastTestResults: Record<string, TestResult> = {};
    private handleTestFinished(test: CppUTest, result: TestResult): void {
        this.lastTestResults[test.id] = result;
    }

    private allTestItems: vscode.TestItem[] = [];

    private async discoverTests(test: vscode.TestItem | undefined) {

        // if (!test) {
        const loadedTests = await this.root.LoadTests();
        this.mainSuite.children = loadedTests;
        loadedTests.forEach(executable => {
            let executableGroup = this.controller.createTestItem(executable.id, executable.label);
            this.controller.items.add(executableGroup);
            executable.TestGroups.forEach(testSuite => {
                const testGroup = this.controller.createTestItem(testSuite.id, testSuite.label);
                executableGroup.children.add(testGroup);
                testSuite.Tests.forEach(test => {
                    const testItem = this.controller.createTestItem(test.id, test.label);
                    this.allTestItems.push(testItem);
                    testGroup.children.add(testItem);
                })
            })
            this.log.info("Tests initialized");
        });
    }
}
