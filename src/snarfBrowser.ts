import {
    workspace,
    window,
    QuickPickItem
} from "vscode";

import axios from "axios";
import * as parser from "fast-xml-parser";
import * as fs from "fs";
import * as unzip from "unzipper";
import * as path from "path";

function flatMap<T, U>(array: T[], callbackfn: (value: T, index: number, array: T[]) => U[]): U[] {
    return Array.prototype.concat(...array.map(callbackfn));
}

export async function snarfBrowser() {
    const snarfUrl = workspace.getConfiguration("web-cat").get<string>("snarf-url");

    if (snarfUrl === undefined || snarfUrl === "") {
        return window.showInformationMessage("Please set web-cat.snarf-url in settings.");
    }

    const dir = workspace.workspaceFolders?.[0].uri.fsPath;

    if (dir === undefined) {
        return window.showInformationMessage("Please open a folder first.");
    }

    try {
        const resp = await axios.get(snarfUrl);
        const xml = parser.parse(resp.data, {
            ignoreAttributes: false
        });

        const items = [].concat(...xml.snarf_site.package.map((value: any, idx: number) => ({
            label: value["@_name"],
            description: idx.toString(),
            detail: value.description,
            url: value.entry["@_url"]
        })));

        const result = await window.showQuickPick<QuickPickItem & { url: string }>(items);

        if (result === undefined) {
            return window.showInformationMessage("Operation canceled.");
        }

        const zipfile = await axios.get(result.url, {
            responseType: 'arraybuffer'
        });
        const zip = await unzip.Open.buffer(zipfile.data);

        zip.extract({
            path: path.join(dir, result.label),
            concurrency: 5
        });

    } catch {
        window.showErrorMessage("Error opening Snarfer Browser");
    }

}
