import { window } from "vscode";
import { getConfig } from "./config";

export const upload = async () => {
  const { submitURLs } = getConfig();

  if (!submitURLs) {
    return window.showErrorMessage("Please set web-CAT.submitURLs in settings.");
  }

  //   // Select folder

  //   const dirResult = await window.showOpenDialog({
  //     canSelectFiles: false,
  //     canSelectFolders: true,
  //     canSelectMany: false,
  //     defaultUri: workspace.workspaceFolders?.[0].uri,
  //     openLabel: "Select Folder",
  //   });
  //   if (!dirResult) return window.showInformationMessage("Operation canceled.");
  //   const dir = dirResult[0].path;

  //   // Enter credentials

  //   const username = await window.showInputBox({ prompt: "Web-CAT Username" });
  //   if (!username) return window.showInformationMessage("Operation canceled.");
  //   const password = await window.showInputBox({ prompt: "Web-CAT Password", password: true });
  //   if (!password) return window.showInformationMessage("Operation canceled.");

  //   // Make zip file

  //   const output = new streamBuffers.WritableStreamBuffer();

  //   const archive = archiver("zip");
  //   archive.pipe(output);
  //   archive.directory(dir, false);
  //   await archive.finalize();

  //   // console.log(dir, username, password);

  window.showInformationMessage("Submitted");
};
