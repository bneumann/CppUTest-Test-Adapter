import * as vscode from 'vscode';
import { CppUTestAdapter2 } from './CppUTestAdapter2';

export async function activate(context: vscode.ExtensionContext) {

    const adapter = new CppUTestAdapter2();
    console.log(adapter);
    context.subscriptions.push(adapter.Controller);
    // const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];

    // // create a simple logger that can be configured with the configuration variables
    // // `cpputestExplorer.logpanel"` and `cpputestExplorer.logfile`
    // const log = new Log('cpputestExplorer', workspaceFolder, 'CppUTest Explorer Log');
    // context.subscriptions.push(log);

    // // get the Test Explorer extension
    // const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
    // if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

    // if (testExplorerExtension) {

    // 	const testHub = testExplorerExtension.exports;
    // 	// this will register an CppUTestTestAdapter for each WorkspaceFolder
    // 	context.subscriptions.push(new TestAdapterRegistrar(
    // 		testHub,
    // 		workspaceFolder => new CppUTestAdapter(workspaceFolder, log),
    // 		log
    // 	));
    // }
}


