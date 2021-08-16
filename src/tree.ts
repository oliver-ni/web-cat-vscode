import { commands, EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

type TreeData = AsyncItem | undefined | void;

type AsyncItemOptions = {
  label: string;
  tooltip?: string;
  description?: string;
  url?: string;
  iconId?: string;
  children?: AsyncItem[];
};

export abstract class AsyncTreeDataProvider implements TreeDataProvider<AsyncItem> {
  private _onDidChangeTreeData = new EventEmitter<TreeData>();
  private data?: AsyncItem[];
  private ready = false;

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: AsyncItem) {
    return element;
  }

  async getChildren(element?: AsyncItem) {
    if (element) return element.children;

    if (!this.ready) {
      commands.executeCommand("setContext", "web-CAT.snarfsLoaded", false);
      this.data = await this.fetchData();
      commands.executeCommand("setContext", "web-CAT.snarfsLoaded", true);
    }

    return this.data;
  }

  abstract fetchData(): Promise<AsyncItem[] | undefined>;

  async refresh() {
    this.ready = false;
    this._onDidChangeTreeData.fire();
  }
}

export class AsyncItem extends TreeItem {
  label: string;
  url?: string;
  children?: AsyncItem[];

  constructor({ label, tooltip, description, url, iconId, children }: AsyncItemOptions) {
    super(label, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);

    this.label = label;
    this.tooltip = tooltip;
    this.description = description;
    this.children = children;
    this.url = url;

    if (iconId) this.iconPath = new ThemeIcon(iconId);
    if (url) this.contextValue = "project";
  }
}
