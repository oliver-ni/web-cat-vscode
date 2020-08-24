import { workspace, window, ViewColumn } from "vscode";

import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export async function upload(jarPath: string) {
    try {
        // Get submission targets

        const javaPath = workspace
            .getConfiguration("web-cat")
            .get<string>("java-path");

        if (javaPath === undefined || javaPath === "") {
            return window.showInformationMessage(
                "Please set web-cat.java-path in settings."
            );
        }

        const submitUrl = workspace
            .getConfiguration("web-cat")
            .get<string>("submit-url");

        if (submitUrl === undefined || submitUrl === "") {
            return window.showInformationMessage(
                "Please set web-cat.submit-url in settings."
            );
        }

        const getTargetCmd: string[] = [
            javaPath,
            "-jar",
            jarPath,
            "-t",
            submitUrl,
            "-l",
        ];

        const targets = await exec(getTargetCmd.join(" "));

        const target = await window.showQuickPick(
            targets.stdout.trim().split("\n")
        );

        if (target === undefined) {
            return window.showInformationMessage("Operation canceled.");
        }

        // Select directory

        const dirResult = await window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            defaultUri: workspace.workspaceFolders?.[0].uri,
            openLabel: "Select Folder",
        });

        if (dirResult === undefined) {
            return window.showInformationMessage("Operation canceled.");
        }

        const dir = dirResult[0].path;

        // Get username

        let username = workspace
            .getConfiguration("web-cat")
            .get<string>("webcat-username");

        if (username === undefined || username === "") {
            username = await window.showInputBox({
                prompt:
                    "Web-CAT Username (you can set this in settings if you want to save)",
            });

            if (username === undefined || username === "") {
                return window.showInformationMessage("Operation canceled.");
            }
        }

        // Get password

        let password = workspace
            .getConfiguration("web-cat")
            .get<string>("webcat-password");

        if (password === undefined || password === "") {
            password = await window.showInputBox({
                prompt:
                    "Web-CAT Password (you can set this in settings if you want to save)",
                password: true,
            });

            if (password === undefined || password === "") {
                return window.showInformationMessage("Operation canceled.");
            }
        }

        // Upload

        const submitCmd: string[] = [
            javaPath,
            "-jar",
            jarPath,
            "-t",
            submitUrl,
            "-u",
            '"' + username + '"',
            "-p",
            '"' + password + '"',
            "-a",
            '"' + target + '"',
            '"' + dir + '"',
        ];

        const result = await exec(submitCmd.join(" "));

        const panel = window.createWebviewPanel(
            "submission-result",
            "Web-CAT Submission Results",
            ViewColumn.Two
        );

        panel.webview.html = result.stdout;
    } catch (err) {
        window.showErrorMessage("Error submitting assignment.");
    }
}
