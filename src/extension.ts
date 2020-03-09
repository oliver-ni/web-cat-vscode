import * as vscode from "vscode";
import { snarfBrowser } from "./snarfBrowser";
import { upload } from "./uploader";

export function activate(context: vscode.ExtensionContext) {

	console.log("Web-CAT Submitter extension activating...");

	let snarf = vscode.commands.registerCommand("web-cat.snarf", () => {
		snarfBrowser();
	});

	let submit = vscode.commands.registerCommand("web-cat.submit", () => {
		upload(context.asAbsolutePath("webcat-submitter-1.0.5.jar"));
	});

	context.subscriptions.push(snarf);
	context.subscriptions.push(submit);
}

export function deactivate() {

	console.log("Web-CAT Submitter extension deactivating...");

}
