import * as vscode from 'vscode';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { Log, TestAdapterRegistrar } from 'vscode-test-adapter-util';
import { CppUTestAdapter } from './adapter';

export async function activate(context: vscode.ExtensionContext) {

	const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

	// create a simple logger that can be configured with the configuration variables
	// `cpputestTestAdapter.logToOutputPanel"` and `cpputestTestAdapter.logToFile`
	const log = new Log('cpputestTestAdapter', workspaceFolder, 'CppUTest Test Adapter Log');
	context.subscriptions.push(log);

	// get the Test Explorer extension
	const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
	if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

	if (testExplorerExtension) {

		const testHub = testExplorerExtension.exports;
		// this will register an CppUTestTestAdapter for each WorkspaceFolder
		context.subscriptions.push(new TestAdapterRegistrar(
			testHub,
			workspaceFolder => new CppUTestAdapter(workspaceFolder, log),
			log
		));
	}
}
