import * as AdmZip from "adm-zip";
import * as parser from "fast-xml-parser";
import fetch from "node-fetch";
import { parse as parseHTML } from "node-html-parser";
import { commands, ExtensionContext, InputBoxOptions, ViewColumn, window, workspace } from "vscode";
import { AsyncItem, AsyncTreeDataProvider } from "./asyncTree";
import { delay, getConfig } from "./utils";
import FormData = require("form-data");

type TransportParam = { name: string; value: string };
type Transport = { uri: string; params: TransportParam[]; fileParams: TransportParam[] };
type Assignment = { name: string; transport: Transport };
type AssignmentGroup = { name: string; assignments: Assignment[] };
type SubmissionRoot = { groups: AssignmentGroup[] };

const parseTransportParam = (value: any): TransportParam => {
  return {
    name: value["@_name"],
    value: value["@_value"],
  };
};

const parseTransport = (value: any): Transport => {
  return {
    uri: value["@_uri"],
    params: value["param"].map(parseTransportParam),
    fileParams: value["file-param"].map(parseTransportParam),
  };
};

const parseAssignment = (value: any): Assignment => {
  return {
    name: value["@_name"],
    transport: parseTransport(value["transport"][0]),
  };
};

const parseAssignmentGroup = (value: any): AssignmentGroup => {
  return {
    name: value["@_name"],
    assignments: value["assignment"].map(parseAssignment),
  };
};

const parseSubmissionRoot = (value: any): SubmissionRoot => {
  return {
    groups: value["submission-targets"][0]["assignment-group"].map(parseAssignmentGroup),
  };
};

export class UploadDataProvider extends AsyncTreeDataProvider {
  private async fetchSite(url: string): Promise<SubmissionRoot> {
    const resp = await fetch(url);
    const content = await resp.text();
    const xml = parser.parse(content, { ignoreAttributes: false, arrayMode: true });
    return parseSubmissionRoot(xml);
  }

  async fetchData() {
    const { submitURLs } = getConfig();
    if (!submitURLs) return;

    const roots = await Promise.all(submitURLs.map(this.fetchSite));

    return roots.flatMap((root) =>
      root.groups.map(
        (group) =>
          new AsyncItem({
            label: group.name,
            iconId: "project",
            children: group.assignments.map(
              (assignment) =>
                new AsyncItem({
                  label: assignment.name,
                  iconId: "package",
                  contextValue: "project",
                  item: assignment,
                })
            ),
          })
      )
    );
  }

  beforeLoad() {
    commands.executeCommand("setContext", "web-CAT.targetsErrored", false);
    commands.executeCommand("setContext", "web-CAT.targetsLoaded", false);
  }

  afterLoad() {
    commands.executeCommand("setContext", "web-CAT.targetsErrored", false);
    commands.executeCommand("setContext", "web-CAT.targetsLoaded", true);
  }

  onLoadError(e: Error) {
    super.onLoadError(e);
    commands.executeCommand("setContext", "web-CAT.targetsErrored", true);
  }
}

const PROMPT_ON: { [key: string]: InputBoxOptions } = {
  "${user}": { prompt: "Web-CAT Username" },
  "${pw}": { prompt: "Web-CAT Password", password: true },
  "${partners}": { prompt: "Partners" },
};

export const uploadItem = (item: AsyncItem, context: ExtensionContext) => {
  const assignment = <Assignment>item.item;

  const action = async () => {
    const vars: Map<string, string> = new Map();
    const formatVars = (value: string) => {
      for (const [k, v] of vars.entries()) {
        value = value.replace(k, v);
      }
      return value;
    };

    const files: { param: TransportParam; dir: string }[] = [];

    for (const param of assignment.transport.fileParams) {
      const dirResult = await window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        defaultUri: workspace.workspaceFolders?.[0]?.uri,
        openLabel: `Select Folder (${param.name})`,
      });

      if (!dirResult) return window.showInformationMessage("Operation canceled.");
      files.push({ param, dir: dirResult[0].path });
    }

    // Enter credentials

    const body = new FormData();

    for (const param of assignment.transport.params) {
      if (PROMPT_ON.hasOwnProperty(param.value)) {
        let value = vars.get(param.value);
        if (!value) {
          value = await window.showInputBox({
            ...PROMPT_ON[param.value],
            value: context.globalState.get(param.value),
          });
          if (!value) return window.showInformationMessage("Operation canceled.");
        }
        await context.globalState.update(param.value, value);
        vars.set(param.value, value);
      }

      body.append(param.name, formatVars(param.value));
    }

    // Make zip file

    for (const { param, dir } of files) {
      const zip = new AdmZip();
      zip.addLocalFolder(dir);
      body.append(param.name, zip.toBuffer(), {
        filename: formatVars(param.value),
      });
    }

    const panel = window.createWebviewPanel("submissionResult", "Web-CAT Submission Results", ViewColumn.Two);
    panel.webview.html = `
    <!DOCTYPE html>
    <html>
      <head><title>Submitting to Web-CAT...</title></head>
      <body>${loadingBar}</body>
    </html>
    `;

    // Request

    const resp = await fetch(assignment.transport.uri, {
      method: "POST",
      body,
    });
    const html = await resp.text();
    const tree = parseHTML(html);
    const resultsUrl = tree.querySelector("a")?.attrs?.href;
    tree.querySelector("body").insertAdjacentHTML("afterbegin", loadingBar);
    panel.webview.html = tree.toString();

    // Fetch until results are there

    const resultsResp = await fetch(resultsUrl);
    const resultsHtml = await resultsResp.text();
    const resultsTree = parseHTML(resultsHtml);
    resultsTree.querySelector("body").insertAdjacentHTML("afterbegin", infoBox(resultsUrl));
    resultsTree.querySelector("body").insertAdjacentHTML("afterbegin", loadingBar);
    panel.webview.html = resultsTree.toString();

    for (let i = 0; i < 10; i++) {
      const resp = await fetch(resultsUrl);
      const html = await resp.text();
      if (!html.includes("Assignment Queued for Grading")) {
        const tree = parseHTML(html);
        tree.querySelector("body").insertAdjacentHTML("afterbegin", infoBox(resultsUrl));
        panel.webview.html = tree.toString();
        return;
      }
      await delay(500);
    }

    resultsTree.querySelector("body").removeChild(resultsTree.querySelector(".wc-vsc-slider"));
    panel.webview.html = resultsTree.toString();
  };

  try {
    window.withProgress({ location: { viewId: "uploadBrowser" }, title: "Uploading..." }, () =>
      Promise.all([delay(1000), action()])
    );
  } catch (err) {
    window.showInformationMessage(`An error occurred: ${err?.message}`);
    console.error(err);
  }
};

const infoBox = (url: string) => `
<div class="wc-vsc-info">
  <p>Showing Web-CAT results. <a href="${url}">Click here to open in browser.</a>
</div>
<style>
.wc-vsc-info {
  padding: 20px;
}
</style>
`;

const loadingBar = `
<div class="wc-vsc-slider">
  <div class="wc-vsc-line"></div>
  <div class="wc-vsc-subline wc-vsc-inc"></div>
  <div class="wc-vsc-subline wc-vsc-dec"></div>
</div>
<style>
  body {
    overflow-x: hidden;
  }
  .wc-vsc-slider {
    height: 5px;
    margin-bottom: 10px;
    overflow-x: hidden;
  }
  .wc-vsc-line {
    position: absolute;
    opacity: 0.4;
    background: #4a8df8;
    width: 150%;
    height: 5px;
  }
  .wc-vsc-subline {
    position: absolute;
    background: #4a8df8;
    height: 5px;
  }
  .wc-vsc-inc {
    animation: increase 2s infinite;
  }
  .wc-vsc-dec {
    animation: decrease 2s 0.5s infinite;
  }
  @keyframes increase {
    from {
      left: -5%;
      width: 5%;
    }
    to {
      left: 130%;
      width: 100%;
    }
  }
  @keyframes decrease {
    from {
      left: -80%;
      width: 80%;
    }
    to {
      left: 110%;
      width: 10%;
    }
  }
</style>
`;
