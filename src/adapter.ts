import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, RetireEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';

import CppUTestContainer from "./Domain/CppUTestContainer";
import { CppUTestGroup } from './Domain/CppUTestGroup';
import { TestState } from './Domain/TestState';
import { TestResult } from './Domain/TestResult';
import { CppUTest } from './Domain/CppUTest';
import { RegexResultParser } from "./Domain/RegexResultParser";
import VscodeSettingsProvider from "./Infrastructure/VscodeSettingsProvider";
import ExecutableRunner from "./Infrastructure/ExecutableRunner";
import { NodeProcessExecuter } from './Application/NodeProcessExecuter';
import { VscodeAdapterImplementation } from "./Application/VscodeAdapterImplementation";

export class CppUTestAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<RetireEvent>();
	private readonly mainSuite: CppUTestGroup;
	private readonly root: CppUTestContainer;


	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get retire(): vscode.Event<RetireEvent> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {

		this.log.info('Initializing adapter');

		this.disposables.push(this.testsEmitter, this.testStatesEmitter, this.autorunEmitter);

		const settingsProvider = new VscodeSettingsProvider(vscode.workspace.getConfiguration("cpputestExplorer"));
		const processExecuter = new NodeProcessExecuter();
		const vscodeAdapter = new VscodeAdapterImplementation();
		const runners = settingsProvider.GetTestRunners().map(runner => new ExecutableRunner(processExecuter, runner));
		const resultParser = new RegexResultParser();

		this.root = new CppUTestContainer(runners, settingsProvider, vscodeAdapter, resultParser);
		this.root.OnTestFinish = this.handleTestFinished.bind(this);
		this.root.OnTestStart = this.handleTestStarted.bind(this);

		this.mainSuite = new CppUTestGroup("Main Suite");
		// runners.forEach(runner => fs.watchFile(<fs.PathLike>runner, (cur: fs.Stats, prev: fs.Stats) => {
		// 	if (cur.mtimeMs !== prev.mtimeMs) {
		// 		this.log.info("Executable changed, updating test cases");
		// 		this.load();
		// 		// this.autorunEmitter.fire();
		// 	}
		// }));
	}

	public async load(): Promise<void> {
		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });
		this.log.info('Loading tests');

		const loadedTests = await this.root.LoadTests();

		this.log.info('Tests loaded');

		this.mainSuite.children = loadedTests;
		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: this.mainSuite });
	}

	public async run(tests: string[]): Promise<void> {
		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });
		this.log.info('Running tests');
		if (tests.length == 1 && tests[0] == this.mainSuite.id) {
			await this.root.RunAllTests();
		} else {
			await this.root.RunTest(...tests);
		}
		this.log.info('Done');
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
	}

	public async debug(tests: string[]): Promise<void> {
		return this.root.DebugTest(...tests);
	}

	public cancel(): void {
		this.root.KillRunningProcesses();
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
	}

	public dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}

	private handleTestStarted(test: CppUTest): void {
		const event = this.mapTestResultToTestEvent(test);
		this.testStatesEmitter.fire(event)
	}

	private handleTestFinished(test: CppUTest, testResult: TestResult): void {
		const event = this.mapTestResultToTestEvent(test, testResult);
		this.testStatesEmitter.fire(event)
	}

	private mapTestResultToTestEvent(test: CppUTest, testResult?: TestResult): TestEvent {
		let state: "running" | "passed" | "failed" | "skipped" | "errored" = "running";
		if (!testResult) {
			return {
				type: "test",
				state,
				test
			};
		}
		switch (testResult.state) {
			case TestState.Errored:
			case TestState.Unknown:
				state = "errored";
				break;
			case TestState.Failed:
				state = "failed";
				break;
			case TestState.Skipped:
				state = "skipped";
				break;
			default:
				state = "passed";
				break;
		}
		return {
			type: 'test',
			test,
			state,
			message: testResult.message
		};
	}
}
