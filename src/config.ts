import { commands, workspace } from "vscode";

/**
 * The configuration for the extension.
 */
type WebCatConfig =
  | { snarfUrl: string; submitUrl: string }
  | { snarfUrl: undefined; submitUrl: undefined };

/**
 * Retrieves the configuration for Web-CAT.
 * @returns {WebCatConfig} the configuration
 */
export function getConfig(): WebCatConfig {
  let snarfUrl = workspace.getConfiguration("web-CAT").get<string>("snarfUrl");
  let submitUrl = workspace.getConfiguration("web-CAT").get<string>("submitUrl");

  if (snarfUrl === "" || submitUrl === "" || snarfUrl === undefined || submitUrl === undefined) {
    return { snarfUrl: undefined, submitUrl: undefined };
  }

  return { snarfUrl, submitUrl };
}

/**
 * Sets the snarf and submit endpoints to the LHS Java preset.
 */
export function configLhsJava() {
  const config = workspace.getConfiguration();
  config.update("web-CAT.snarfUrl", "http://205.173.41.10/javasnarf/snarf.xml", true);
  config.update(
    "web-CAT.submitUrl",
    "http://205.173.41.10/Web-CAT/WebObjects/Web-CAT.woa/wa/assignments/eclipse",
    true
  );
}

/**
 * Sets the snarf and submit endpoints to the LHS APCS preset.
 */
export function configLhsApcs() {
  const config = workspace.getConfiguration();
  config.update("web-CAT.snarfUrl", "http://205.173.41.10/apcssnarf/snarf.xml", true);
  config.update(
    "web-CAT.submitUrl",
    "http://205.173.41.10/Web-CAT/WebObjects/Web-CAT.woa/wa/assignments/eclipse",
    true
  );
}

/**
 * Resets the snarf and submit endpoints.
 */
export function resetConfig() {
  const config = workspace.getConfiguration();
  config.update("web-CAT.snarfUrl", undefined, true);
  config.update("web-CAT.submitUrl", undefined, true);
}

/**
 * Opens the configuration section for Web-CAT.
 */
export function openConfig() {
  commands.executeCommand("workbench.action.openSettings", "web-cat");
}
