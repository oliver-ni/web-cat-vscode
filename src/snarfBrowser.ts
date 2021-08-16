import * as parser from "fast-xml-parser";
import * as fs from "fs";
import fetch from "node-fetch";
import * as path from "path";
import * as unzip from "unzipper";
import { window, workspace } from "vscode";
import { getConfig } from "./config";
import { AsyncItem, AsyncTreeDataProvider } from "./tree";

type SnarfSitePackageItem = {
  "@_category": string;
  "@_name": string;
  "@_version": string;
  description: string;
  entry: { "@_url": string };
};

export class SnarfDataProvider extends AsyncTreeDataProvider {
  private makeItem(x: SnarfSitePackageItem): { category: string; item: AsyncItem } {
    const item = new AsyncItem({
      label: x["@_name"],
      tooltip: x.description,
      description: x["@_version"],
      iconId: "symbol-package",
      url: x.entry["@_url"],
    });
    return { category: x["@_category"], item };
  }

  private async fetchSite(url: string): Promise<{ label: string; packages: SnarfSitePackageItem[] }> {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ${url}.`);

    const content = await resp.text();
    const xml = parser.parse(content, { ignoreAttributes: false });

    return {
      label: xml.snarf_site["@_name"],
      packages: Array.isArray(xml.snarf_site.package) ? xml.snarf_site.package : [xml.snarf_site.package],
    };
  }

  async fetchData() {
    const { snarfURLs } = getConfig();
    if (!snarfURLs) return;

    const sites = await Promise.all(snarfURLs.map(this.fetchSite));

    return sites.map(({ label, packages }) => {
      const items = packages.map(this.makeItem).reduce<{ [key: string]: AsyncItem[] }>((acc, { category, item }) => {
        if (!acc.hasOwnProperty(category)) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {});

      const children = Object.entries(items).map(([label, children]) => {
        return new AsyncItem({
          label,
          iconId: "folder",
          children: children.sort((a, b) => a.label.localeCompare(b.label)),
        });
      });

      return new AsyncItem({ label, iconId: "project", children });
    });
  }
}

export const snarfItem = (item: AsyncItem) => {
  const dir = workspace.workspaceFolders?.[0].uri.fsPath;
  if (!dir) return window.showInformationMessage("Please open a folder first.");

  const downloadItem = async () => {
    if (!item.url) return;

    const resp = await fetch(item.url);
    const zipfile = await resp.buffer();
    const zip = await unzip.Open.buffer(zipfile);

    const unzipPath = path.join(dir, item.label);

    if (fs.existsSync(unzipPath)) {
      const ans = await window.showInformationMessage("Directory already exists. Overwrite?", "Yes", "No");
      if (ans !== "Yes") return;
    }

    await zip.extract({ path: unzipPath, concurrency: 5 });
    window.showInformationMessage(`Succesfully snarfed ${item.label}.`);
  };

  window.withProgress({ location: { viewId: "snarferBrowser" }, title: "Snarfing..." }, () =>
    Promise.all([delay(1000), downloadItem()])
  );
};

const delay = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};
