import { commands, ExtensionContext, window, workspace } from "vscode";
import { SnarfDataProvider, snarfItem } from "./snarfBrowser";
import { UploadDataProvider, uploadItem } from "./uploadBrowser";
import { openConfig, resetConfig, setSnarfConfigLHS, setSubmitConfigLHS } from "./utils";

export const activate = (context: ExtensionContext) => {
  const snarfDataProvider = new SnarfDataProvider();
  window.createTreeView("snarferBrowser", { treeDataProvider: snarfDataProvider });

  const uploadDataProvider = new UploadDataProvider();
  window.createTreeView("uploadBrowser", { treeDataProvider: uploadDataProvider });

  workspace.onDidChangeConfiguration(async ({ affectsConfiguration }) => {
    if (affectsConfiguration("web-CAT.snarfURLs")) await snarfDataProvider.refresh();
    if (affectsConfiguration("web-CAT.submitURLs")) await uploadDataProvider.refresh();
  });

  context.subscriptions.push(
    commands.registerCommand("web-CAT.setSnarfConfigLHS", setSnarfConfigLHS),
    commands.registerCommand("web-CAT.setSubmitConfigLHS", setSubmitConfigLHS),
    commands.registerCommand("web-CAT.openConfig", openConfig),
    commands.registerCommand("web-CAT.resetConfig", resetConfig),
    commands.registerCommand("web-CAT.refreshSnarferBrowser", () => snarfDataProvider.refresh()),
    commands.registerCommand("web-CAT.snarfItem", snarfItem),
    commands.registerCommand("web-CAT.refreshUploadBrowser", () => uploadDataProvider.refresh()),
    commands.registerCommand("web-CAT.uploadItem", (item) => uploadItem(item, context))
  );
};
