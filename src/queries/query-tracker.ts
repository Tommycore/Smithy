import * as vsc from 'vscode';
import * as util from '../util';
import { FileTracker } from '../file-tracker';
import { RelativeUriMap, UriTree } from '../uri-tree';

const QRY_EXT = 'qry' as const;

export class QueryTracker implements vsc.TreeDataProvider<string> {
  private constructor(context: vsc.ExtensionContext, private readonly _fileTracker: FileTracker) {
    context.subscriptions.push(vsc.window.createTreeView('smithy.queryView', {
      treeDataProvider: this,
      canSelectMany: true,
      showCollapseAll: true,
    }));

    _fileTracker.onAdd(e => e.map(uri => this.refreshFolderContaining(uri)));
    _fileTracker.onDelete(e => e.map(uri => this.refreshFolderContaining(uri)));
  }

  private readonly _onDidChangeTreeData = new vsc.EventEmitter<string | void | string[] | null | undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public refresh(args: string | void | string[] | null | undefined)
  {
    this._onDidChangeTreeData.fire(args);
  }

  public refreshFolderContaining(uri: vsc.Uri) {
    this.refresh(this._uriTree.getParentElement(vsc.workspace.asRelativePath(uri, true)));
  }

  public get trackedUris(): RelativeUriMap {
    return this._fileTracker.trackedUris.map(el => {
      const uri  = vsc.Uri.parse(el);
      return { [vsc.workspace.asRelativePath(uri, true)]: uri };
    }).reduce((a, b) => {
      return {...a, ...b};
    }, {});
  }
  private readonly _uriTree: UriTree = new UriTree(this);

  public static async initialise(context: vsc.ExtensionContext) {
    const fileTracker = await FileTracker.createTracker(new RegExp(`\\.${QRY_EXT}$`));
    return new QueryTracker(context, fileTracker);
  }

  public getQueryUri(relativePath: string) {
    // const fileList = this._fileStore[util.removeLeadingSlash(relativePath)];
    // if(!fileList) {
    //   return;
    // }

    // return fileList[fileList.length - 1].uri;
    const pathSplit = relativePath.split('/');
    const wsfName = pathSplit[1];
    const wsfUri = util.getWorkspaceFolderFromNameSync(wsfName).uri;
    const relativePathWithoutWsfName = pathSplit.slice(2).join('/');
    return vsc.Uri.joinPath(wsfUri, relativePathWithoutWsfName);
  }

  async getTreeItem(element: string): Promise<vsc.TreeItem> {
    const result = this._uriTree.getBaseTreeItem(element);
    
    // View shows no empty folders, therefor any element without children must be a file.
    const isFile = result.collapsibleState === vsc.TreeItemCollapsibleState.None;
    if(isFile) {
      const uri = this.getQueryUri(element);
      if(!uri) {
        throw new Error(`Unable to resolve relative path '${element}'.`);
      }
      
      result.resourceUri = uri;
      result.description = true;
    }

    return result;
  }

  async getChildren(element?: string | undefined): Promise<string[]> {
    return this._uriTree.getChildren(element ?? '');
  }

  // private _addUri(uri: vsc.Uri) {
  //   const relPath = vsc.workspace.asRelativePath(uri, false);
  //   const wsf = util.getWorkspaceFolderFromFileSync(uri);

  //   if(!this._fileStore[relPath]) {
  //     this._fileStore[relPath] = [{uri, wsf}];
  //     this._onDidChangeTreeData.fire(this._uriTree.getParentElement(relPath));
  //     return;
  //   }

  //   if(this._fileStore[relPath].find(el => QueryTracker._find(el, uri, wsf))) {
  //     // File already listed.
  //     return;
  //   }

  //   this._fileStore[relPath].push({uri, wsf});
  //   this._fileStore[relPath].sort((a, b) => a.wsf.index - b.wsf.index);

  //   this._onDidChangeTreeData.fire('/' + relPath);
  // }

  // private _deleteUri(uri: vsc.Uri) {
  //   const relPath = vsc.workspace.asRelativePath(uri, false);
  //   const wsf = util.getWorkspaceFolderFromFileSync(uri);

  //   if(!this._fileStore[relPath]) {
  //     return;
  //   }

  //   const index = this._fileStore[relPath].findIndex(el => QueryTracker._find(el, uri, wsf));
  //   if(index !== -1) {
  //     this._fileStore[relPath].splice(index, 1);
  //     if(this._fileStore[relPath].length === 0) {
  //       delete this._fileStore[relPath];
  //     }
  //     this._onDidChangeTreeData.fire(this._uriTree.getParentElement(relPath));
  //   }
  // }

  // private static _find(value: UriAndFolder, uri: vsc.Uri, wsf: vsc.WorkspaceFolder) {
  //   return value.uri.toString() === uri.toString() && value.wsf.index === wsf.index;
  // }
}