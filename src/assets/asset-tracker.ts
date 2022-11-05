import * as vsc from 'vscode';
import * as util from '../util';
import { FileTracker } from '../file-tracker';
import { RelativeUriMap, UriTree } from '../uri-tree';

const IMG_EXT = [
  'gif',
  'jpg',
  'png',
  'tif',
  'jpeg',
  'webp',
] as const;

const TXT_EXT = [
  'md',
] as const;

const DOC_EXT = [
  'ing'
] as const;

const ALL_EXT = [...IMG_EXT, ...TXT_EXT, ...DOC_EXT] as const;

type UriAndFolder = {
  uri: vsc.Uri;
  wsf: vsc.WorkspaceFolder;
};

export class AssetTracker implements vsc.TreeDataProvider<string> {
  private constructor(context: vsc.ExtensionContext, private readonly _fileTracker: FileTracker) {
    context.subscriptions.push(vsc.window.createTreeView('smithy.assetView', {
      treeDataProvider: this,
      canSelectMany: true,
      showCollapseAll: true,
    }));

    _fileTracker.trackedUris.map(uriString => {
      this._addUri(vsc.Uri.parse(uriString));
    });

    _fileTracker.onAdd(e => e.map(uri => this._addUri(uri)));
    _fileTracker.onDelete(e => e.map(uri => this._deleteUri(uri)));
  }

  private readonly _onDidChangeTreeData = new vsc.EventEmitter<string | void | string[] | null | undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public refresh(args: string | void | string[] | null | undefined)
  {
    this._onDidChangeTreeData.fire(args);
  }

  private readonly _fileStore: Record<string, UriAndFolder[]> = {};
  public get trackedUris(): RelativeUriMap {
    return Object.entries(this._fileStore).map(kvp => {
      const list = kvp[1];
      const topmost = list[list.length - 1];
      if(!topmost) {
        // TODO: output name of key instead of empty array.
        throw new Error(`Trying to read non-existing entry ${kvp[0]}`);
      }
      return { [vsc.workspace.asRelativePath(topmost.uri, false)]: topmost.uri };
    }).reduce((a, b) => {
      return {...a, ...b};
    }, {});
  }
  private readonly _uriTree: UriTree = new UriTree(this);

  public static async initialise(context: vsc.ExtensionContext) {
    const fileTracker = await FileTracker.createTracker(new RegExp(`\\.(?:(?:${ALL_EXT.join(')|(?:')}))$`));
    return new AssetTracker(context, fileTracker);
  }

  public getAssetUri(relativePath: string) {
    const fileList = this._fileStore[util.removeLeadingSlash(relativePath)];
    if(!fileList) {
      return;
    }

    return fileList[fileList.length - 1].uri;
  }

  async getTreeItem(element: string): Promise<vsc.TreeItem> {
    const result = this._uriTree.getBaseTreeItem(element);
    
    // View shows no empty folders, therefor any element without children must be a file.
    const isFile = result.collapsibleState === vsc.TreeItemCollapsibleState.None;
    if(isFile) {
      const uri = this.getAssetUri(element);
      if(!uri) {
        throw new Error(`Unable to resolve relative path '${element}'.`);
      }
      const tooltip = new vsc.MarkdownString();
      const ext = uri.path.substring(uri.path.lastIndexOf('.') + 1);
      if(TXT_EXT.find(el => el === ext)) {
        tooltip.value = (await (vsc.workspace.fs.readFile(uri))).toString();
        result.tooltip = tooltip;
      }
      else if(IMG_EXT.find(el => el === ext)) {
        tooltip.value = `![${element.split('/').pop()}](${uri})`;
        result.tooltip = tooltip;
      }
      
      result.resourceUri = uri;
      result.description = vsc.workspace.asRelativePath(uri, false).split('/').slice(0, -1).join('/');
    }

    return result;
  }

  async getChildren(element?: string | undefined): Promise<string[]> {
    return this._uriTree.getChildren(element ?? '');
  }

  private _addUri(uri: vsc.Uri) {
    const relPath = vsc.workspace.asRelativePath(uri, false);
    const wsf = util.getWorkspaceFolderFromFileSync(uri);

    if(!this._fileStore[relPath]) {
      this._fileStore[relPath] = [{uri, wsf}];
      this._onDidChangeTreeData.fire(this._uriTree.getParentElement(relPath));
      return;
    }

    if(this._fileStore[relPath].find(el => AssetTracker._find(el, uri, wsf))) {
      // File already listed.
      return;
    }

    this._fileStore[relPath].push({uri, wsf});
    this._fileStore[relPath].sort((a, b) => a.wsf.index - b.wsf.index);

    this._onDidChangeTreeData.fire('/' + relPath);
  }

  private _deleteUri(uri: vsc.Uri) {
    const relPath = vsc.workspace.asRelativePath(uri, false);
    const wsf = util.getWorkspaceFolderFromFileSync(uri);

    if(!this._fileStore[relPath]) {
      return;
    }

    const index = this._fileStore[relPath].findIndex(el => AssetTracker._find(el, uri, wsf));
    if(index !== -1) {
      this._fileStore[relPath].splice(index, 1);
      if(this._fileStore[relPath].length === 0) {
        delete this._fileStore[relPath];
      }
      this._onDidChangeTreeData.fire(this._uriTree.getParentElement(relPath));
    }
  }

  private static _find(value: UriAndFolder, uri: vsc.Uri, wsf: vsc.WorkspaceFolder) {
    return value.uri.toString() === uri.toString() && value.wsf.index === wsf.index;
  }
}