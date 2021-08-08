import axios from "axios";
import * as parser from "fast-xml-parser";
import * as path from "path";
import * as unzip from "unzipper";
import {
  commands,
  Event,
  EventEmitter,
  ThemeIcon,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  window,
  workspace,
} from "vscode";
import { getConfig } from "./config";

type TreeData = SnarfItem | undefined | void;

type SnarfItemOptions = {
  label: string;
  tooltip?: string;
  description?: string;
  url?: string;
  iconId?: string;
  children?: SnarfItem[];
};

/**
 * Provides the data to the snarfer browser tree view from the snarf site.
 */
export class SnarfDataProvider implements TreeDataProvider<SnarfItem> {
  private _onDidChangeTreeData: EventEmitter<TreeData> = new EventEmitter<TreeData>();
  private data?: SnarfItem[];
  private ready = false;

  readonly onDidChangeTreeData: Event<TreeData> = this._onDidChangeTreeData.event;

  getTreeItem(element: SnarfItem) {
    return element;
  }

  async getChildren(element?: SnarfItem) {
    if (element === undefined) {
      if (!this.ready) {
        await this.fetchData();
      }
      return this.data;
    }
    return element.children;
  }

  private async fetchData() {
    commands.executeCommand("setContext", "web-CAT.snarfsLoaded", false);

    const { snarfUrl: url } = getConfig();

    if (url === undefined) {
      this.data = undefined;
    } else {
      const resp = await axios.get(url);
      const xml = parser.parse(resp.data, { ignoreAttributes: false });

      const packages: any[] = Array.isArray(xml.snarf_site.package)
        ? xml.snarf_site.package
        : [xml.snarf_site.package];

      const categories = packages.reduce<Map<string, SnarfItem[]>>((obj, x) => {
        const item = new SnarfItem({
          label: x["@_name"],
          tooltip: x.description,
          description: x["@_version"],
          iconId: "symbol-package",
          url: x.entry["@_url"],
        });

        const arr = obj.get(x["@_category"]);
        if (arr === undefined) obj.set(x["@_category"], [item]);
        else arr.push(item);
        return obj;
      }, new Map());

      this.data = [
        new SnarfItem({
          label: xml.snarf_site["@_name"],
          iconId: "project",
          children: [...categories.entries()].map(
            ([label, children]) =>
              new SnarfItem({
                label,
                iconId: "folder",
                children: children.sort((a, b) => a.label.localeCompare(b.label)),
              })
          ),
        }),
      ];
    }

    commands.executeCommand("setContext", "web-CAT.snarfsLoaded", true);
  }

  /**
   * Refreshes the tree view data.
   */
  async refresh() {
    this.ready = false;
    this._onDidChangeTreeData.fire();
  }
}

class SnarfItem extends TreeItem {
  label: string;
  url?: string;
  children?: SnarfItem[];

  constructor({ label, tooltip, description, url, iconId, children }: SnarfItemOptions) {
    super(
      label,
      children === undefined ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Expanded
    );

    this.label = label;
    this.tooltip = tooltip;
    this.description = description;
    this.children = children;
    this.url = url;

    if (iconId !== undefined) this.iconPath = new ThemeIcon(iconId);
    if (url !== undefined) this.contextValue = "project";
  }
}

function delay(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

/**
 * Snarfs an item to the currently open directory.
 * @param item the item to snarf.
 * @returns {void}
 */
export function snarfItem(item: SnarfItem) {
  const dir = workspace.workspaceFolders?.[0].uri.fsPath;

  if (dir === undefined) {
    window.showInformationMessage("Please open a folder first.");
    return;
  }

  const downloadItem = async () => {
    if (item.url === undefined) return;

    const zipfile = await axios.get(item.url, { responseType: "arraybuffer" });
    const zip = await unzip.Open.buffer(zipfile.data);

    zip.extract({
      path: path.join(dir, item.label),
      concurrency: 5,
    });
  };

  window.withProgress({ location: { viewId: "web-CAT" }, title: "Snarfing..." }, async () => {
    await Promise.all([delay(1000), downloadItem()]);
    window.showInformationMessage(`Succesfully snarfed ${item.label}.`);
  });
}
