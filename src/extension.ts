import { commands, ExtensionContext, window, workspace } from "vscode";
import { openConfig, resetConfig, setSnarfConfigLHS, setSubmitConfigLHS } from "./config";
import { SnarfDataProvider, snarfItem } from "./snarfBrowser";
import { upload } from "./uploader";

export const activate = (context: ExtensionContext) => {
  console.log("Web-CAT Submitter extension activating...");

  const snarfDataProvider = new SnarfDataProvider();
  window.createTreeView("snarferBrowser", { treeDataProvider: snarfDataProvider });

  workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("web-CAT.snarfURLs")) {
      await snarfDataProvider.refresh();
    }
  });

  context.subscriptions.push(
    commands.registerCommand("web-CAT.setSnarfConfigLHS", setSnarfConfigLHS),
    commands.registerCommand("web-CAT.setSubmitConfigLHS", setSubmitConfigLHS),
    commands.registerCommand("web-CAT.openConfig", openConfig),
    commands.registerCommand("web-CAT.resetConfig", resetConfig),
    commands.registerCommand("web-CAT.snarfItem", snarfItem),

    commands.registerCommand("web-CAT.submit", upload)
  );
};

export const deactivate = () => {
  console.log("Web-CAT Submitter extension deactivating...");
};
