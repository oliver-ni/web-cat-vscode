import * as vscode from "vscode";
import { snarfBrowser } from "./snarfBrowser";

export function activate(context: vscode.ExtensionContext) {

	console.log("Web-CAT Submitter Extension Activated!");

	let snarf = vscode.commands.registerCommand("web-cat.snarf", () => {
		snarfBrowser();
	});

	context.subscriptions.push(snarf);
}

// this method is called when your extension is deactivated
export function deactivate() { }
