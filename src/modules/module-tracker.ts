import * as vsc from 'vscode';
import * as util from '../util';
import { FileTracker } from '../file-tracker';
import { RelativeUriMap, UriTree } from '../uri-tree';

export const MODULE_EXT = 'prj' as const;

export class ModuleTracker implements vsc.TreeDataProvider<string> {
  private constructor(context: vsc.ExtensionContext, private readonly _fileTracker: FileTracker) {
    context.subscriptions.push(vsc.window.createTreeView('smithy.moduleView', {
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
    const fileTracker = await FileTracker.createTracker(new RegExp(`\\.${MODULE_EXT}$`));
    return new ModuleTracker(context, fileTracker);
  }

  public getModuleUri(relativePath: string) {
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
      const uri = this.getModuleUri(element);
      if(!uri) {
        throw new Error(`Unable to resolve relative path '${element}'.`);
      }
      
      result.resourceUri = uri;
      result.description = true;
      result.contextValue = 'module';
    }

    return result;
  }

  async getChildren(element?: string | undefined): Promise<string[]> {
    return this._uriTree.getChildren(element ?? '');
  }
}