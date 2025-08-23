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
import ExecutableRunner, { ExecutableRunnerOptions } from "./Infrastructure/ExecutableRunner";
import { NodeProcessExecuter } from './Application/NodeProcessExecuter';
import { VscodeAdapterImplementation } from "./Application/VscodeAdapterImplementation";
import { SettingsProvider } from "./Infrastructure/SettingsProvider";
import { ProcessExecuter } from "./Application/ProcessExecuter";

export class CppUTestAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<RetireEvent>();
	private readonly mainSuite: CppUTestGroup;
	private readonly root: CppUTestContainer;
	private readonly settingsProvider: SettingsProvider;
	private readonly processExecuter: ProcessExecuter;

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get retire(): vscode.Event<RetireEvent> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {

		this.log.info('Initializing adapter');

		this.disposables.push(this.testsEmitter, this.testStatesEmitter, this.autorunEmitter);

		this.settingsProvider = new VscodeSettingsProvider(this.log);
		this.processExecuter = new NodeProcessExecuter();
		const vscodeAdapter = new VscodeAdapterImplementation();
		const resultParser = new RegexResultParser();

		this.root = new CppUTestContainer(this.settingsProvider, vscodeAdapter, resultParser);
		this.root.OnTestFinish = this.handleTestFinished.bind(this);
		this.root.OnTestStart = this.handleTestStarted.bind(this);

		this.mainSuite = new CppUTestGroup("Main Suite", "");
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

		await this.updateTests();

		this.log.info('Tests loaded');
	}

	public async run(tests: string[]): Promise<void> {
		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });
		this.log.info('Running tests');
		if (await this.updateTests())
		{
			if (tests.length == 1 && tests[0] == this.mainSuite.id || tests[0] == 'error') {
				await this.root.RunAllTests();
			} else {
				await this.root.RunTest(...tests);
			}
		}
		this.log.info('Done');
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
	}

	public async debug(tests: string[]): Promise<void> {
		if (await this.updateTests())
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

	private async updateTests(): Promise<boolean> {
		const preLaunchTask = await this.getPreLaunchTask();
		if (preLaunchTask) {
			const errorCode = await this.runTask(preLaunchTask);
			if (errorCode) {
				this.mainSuite.children = [];
				this.testsEmitter.fire(<TestLoadFinishedEvent>{
					type: 'finished',
					errorMessage: `preLaunchTask "${preLaunchTask.name}" Failed [exit code: ${errorCode}]`,
				});
				return false;
			}
		}
		this.root.ClearTests();
		const runners = this.settingsProvider.GetTestRunners().map(runner => new ExecutableRunner(this.processExecuter, runner, this.log, this.GetExecutionOptions()));
		const loadedTests = await this.root.LoadTests(runners);
		this.mainSuite.children = loadedTests;
		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: this.mainSuite });
		return true;
	}

	private async getPreLaunchTask(): Promise<vscode.Task | undefined> {
		const preLaunchTaskName = this.settingsProvider.GetPreLaunchTask();
		if (!preLaunchTaskName)
			return undefined;
		const tasks = await vscode.tasks.fetchTasks();
		return tasks.find((value, ..._) => value.name == preLaunchTaskName);
	}

	private async runTask(task: vscode.Task): Promise<number> {
		const taskProcessEnded: Promise<number> = new Promise((resolve, _) => {
			const hook_disposable = vscode.tasks.onDidEndTaskProcess((e) => {
				if (e.execution.task !== task)
					return;
				hook_disposable.dispose();
				resolve(e.exitCode ?? 0);
			}, this, this.disposables)
		});

		await vscode.tasks.executeTask(task);
		return await taskProcessEnded;
	}

	private GetExecutionOptions(): ExecutableRunnerOptions | undefined {
		const testPath = this.settingsProvider.GetTestPath();
		return {
			objDumpExecutable: this.settingsProvider.GetObjDumpPath(),
			workingDirectory: testPath || undefined
		}
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
