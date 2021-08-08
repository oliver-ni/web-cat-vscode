import { commands, ExtensionContext, window, workspace } from "vscode";
import { configLhsApcs, configLhsJava, openConfig, resetConfig } from "./config";
import { SnarfDataProvider, snarfItem } from "./snarfBrowser";

export function activate(context: ExtensionContext) {
  console.log("Web-CAT Submitter extension activating...");

  const treeDataProvider = new SnarfDataProvider();
  window.createTreeView("web-CAT", { treeDataProvider });

  workspace.onDidChangeConfiguration(async (event) => {
    if (
      event.affectsConfiguration("web-CAT.snarfUrl") ||
      event.affectsConfiguration("web-CAT.submitUrl")
    ) {
      await treeDataProvider.refresh();
    }
  });

  const showDialog = () => {
    window.showInformationMessage(
      "This command has been removed. Please use the new Web-CAT panel located in the left sidebar."
    );
  };

  context.subscriptions.push(
    commands.registerCommand("web-CAT.configLhsJava", configLhsJava),
    commands.registerCommand("web-CAT.configLhsApcs", configLhsApcs),
    commands.registerCommand("web-CAT.openConfig", openConfig),
    commands.registerCommand("web-CAT.resetConfig", resetConfig),
    commands.registerCommand("web-CAT.snarfItem", snarfItem),

    commands.registerCommand("web-CAT.snarf", showDialog),
    commands.registerCommand("web-CAT.submit", showDialog)
  );
}

export function deactivate() {
  console.log("Web-CAT Submitter extension deactivating...");
}
