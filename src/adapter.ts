import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent, RetireEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { runTests, killTestRun, getTestRunners, debugTest } from './legacyWrapper'
import *  as fs from 'fs';
import { exec, execFile } from "child_process";

import CppUTestContainer from "./CppUTestContainer";
import SettingsProvider from "./SettingsProvider";
import ExecutableRunner from "./ExecutableRunner";
import { CppUTestGroup } from './CppUTestGroup';

export class CppUTestAdapter implements TestAdapter {

	private disposables: { dispose(): void }[] = [];

	private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
	private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
	private readonly autorunEmitter = new vscode.EventEmitter<RetireEvent>();
	private readonly root: CppUTestContainer;

	get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
	get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
	get retire(): vscode.Event<RetireEvent> | undefined { return this.autorunEmitter.event; }

	constructor(
		public readonly workspace: vscode.WorkspaceFolder,
		private readonly log: Log
	) {

		this.log.info('Initializing adapter');

		this.disposables.push(this.testsEmitter);
		this.disposables.push(this.testStatesEmitter);
		this.disposables.push(this.autorunEmitter);

		const settingsProvider = new SettingsProvider(vscode.workspace.getConfiguration("cpputestExplorer"));
		this.root = new CppUTestContainer(
			settingsProvider.GetTestRunners().map(runner => new ExecutableRunner(exec, execFile, runner)));

		const runners: string[] = getTestRunners();
		runners.forEach(runner => fs.watchFile(<fs.PathLike>runner, (cur: fs.Stats, prev: fs.Stats) => {
			if (cur.mtimeMs !== prev.mtimeMs) {
				this.log.info("Executable changed, updating test cases");
				this.load();
				// this.autorunEmitter.fire();
			}
		}));
	}

	async load(): Promise<void> {

		this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });
		this.log.info('Loading tests');

		const loadedTests = await Promise.all(this.root.LoadTests());

		this.log.info('Tests loaded');

		const suite = new CppUTestGroup("Main Suite");
		suite.children = loadedTests;
		this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite });

	}

	async run(tests: string[]): Promise<void> {

		this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });
		this.log.info('Running tests');
		await runTests(tests, this.testStatesEmitter);
		this.log.info('Done');
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });

	}

	async debug(tests: string[]): Promise<void> {
		// start a test run in a child process and attach the debugger to it...
		await debugTest(tests);
	}

	cancel(): void {
		killTestRun();
		this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
	}

	dispose(): void {
		this.cancel();
		for (const disposable of this.disposables) {
			disposable.dispose();
		}
		this.disposables = [];
	}
}
