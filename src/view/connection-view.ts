import * as vsc from 'vscode';

export class ConnectionView implements vsc.TreeDataProvider<string> {
  private readonly _onDidChangeTreeData = new vsc.EventEmitter<string | void | string[] | null | undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: string): vsc.TreeItem | Thenable<vsc.TreeItem> {
    throw new Error('Method not implemented.');
  }

  getChildren(element?: string | undefined): vsc.ProviderResult<string[]> {
    throw new Error('Method not implemented.');
  }

  getParent?(element: string): vsc.ProviderResult<string> {
    throw new Error('Method not implemented.');
  }

  resolveTreeItem?(item: vsc.TreeItem, element: string, token: vsc.CancellationToken): vsc.ProviderResult<vsc.TreeItem> {
    throw new Error('Method not implemented.');
  }
}