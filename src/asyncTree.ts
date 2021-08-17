import { EventEmitter, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from "vscode";

type TreeData = AsyncItem | undefined | void;

type AsyncItemOptions = {
  label: string;
  tooltip?: string;
  description?: string;
  item?: any;
  iconId?: string;
  contextValue?: string;
  children?: AsyncItem[];
};

export abstract class AsyncTreeDataProvider implements TreeDataProvider<AsyncItem> {
  private data?: AsyncItem[];
  private ready = false;

  private _onDidChangeTreeData = new EventEmitter<TreeData>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: AsyncItem) {
    return element;
  }

  async getChildren(element?: AsyncItem) {
    if (element) return element.children;

    if (!this.ready) {
      this.beforeLoad();
      try {
        this.data = await this.fetchData();
      } catch (e) {
        this.onLoadError(e);
        return;
      }
      this.afterLoad();
    }

    return this.data;
  }

  abstract fetchData(): Promise<AsyncItem[] | undefined>;
  beforeLoad() {}
  afterLoad() {}
  onLoadError(e: Error) {
    window.showErrorMessage(e.message);
  }

  refresh() {
    this.ready = false;
    this._onDidChangeTreeData.fire();
  }
}

export class AsyncItem extends TreeItem {
  label: string;
  item?: any;
  children?: AsyncItem[];

  constructor({ label, tooltip, description, item, iconId, contextValue, children }: AsyncItemOptions) {
    super(label, children ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None);

    this.label = label;
    this.tooltip = tooltip;
    this.description = description;
    this.children = children;
    this.contextValue;
    this.item = item;
    this.contextValue = contextValue;

    if (iconId) this.iconPath = new ThemeIcon(iconId);
  }
}
