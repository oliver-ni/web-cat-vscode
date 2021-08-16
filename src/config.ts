import { commands, workspace } from "vscode";

type WebCatConfig = { snarfURLs?: string[]; submitURLs?: string[] };

export const getConfig = (): WebCatConfig => {
  let snarfURLs = workspace.getConfiguration("web-CAT").get<string[]>("snarfURLs");
  let submitURLs = workspace.getConfiguration("web-CAT").get<string[]>("submitURLs");

  return { snarfURLs, submitURLs };
};

export const setSnarfConfigLHS = () => {
  const config = workspace.getConfiguration();
  config.update(
    "web-CAT.snarfURLs",
    [
      "http://205.173.41.10/pythonsnarf/snarf.xml",
      "http://205.173.41.10/javasnarf/snarf.xml",
      "http://205.173.41.10/apcssnarf/snarf.xml",
    ],
    true
  );
};

export const setSubmitConfigLHS = () => {
  const config = workspace.getConfiguration();
  config.update(
    "web-CAT.submitURLs",
    ["http://205.173.41.10/Web-CAT/WebObjects/Web-CAT.woa/wa/assignments/eclipse"],
    true
  );
};

export const resetConfig = () => {
  const config = workspace.getConfiguration();
  config.update("web-CAT.snarfURLs", [], true);
  config.update("web-CAT.submitURLs", [], true);
};

export const openConfig = () => {
  commands.executeCommand("workbench.action.openSettings", "web-cat");
};
