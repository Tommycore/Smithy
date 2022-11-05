import * as vsc from 'vscode';
import { TYPE_SCHEME } from './schema-core';
import { SchemaDB } from './schema-db';
import { TypeSchemeProvider } from './type-scheme-provider';

export class SchemaView implements vsc.TreeDataProvider<vsc.Uri> {
  constructor(context: vsc.ExtensionContext) {
    context.subscriptions.push(vsc.window.createTreeView('smithy.schemaView', {
      treeDataProvider: this,
      canSelectMany: true,
      showCollapseAll: true,
    }));

    context.subscriptions.push(vsc.commands.registerCommand('smithy.refreshSchemaView',
      (args: vsc.Uri | void | vsc.Uri[] | null | undefined) => this.refresh(args)));
  }

  private readonly _onDidChangeTreeData = new vsc.EventEmitter<vsc.Uri | void | vsc.Uri[] | null | undefined>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  public refresh(args: vsc.Uri | void | vsc.Uri[] | null | undefined) {
    this._onDidChangeTreeData.fire(args);
  }

  public async getTreeItem(element: vsc.Uri): Promise<vsc.TreeItem> {
    const isNative = SchemaDB.isNativeSchemaCollection(element.authority);

    return TypeSchemeProvider.isSchema(element) ?
      await this._getSchemaTreeItem(element, isNative) :
      await this._getCollectionTreeItem(element, isNative);
  }

  private async _getSchemaTreeItem(element: vsc.Uri, isNative: boolean) {
    const schema = await SchemaDB.getSchema(element.authority, element.path.substring(1));
      if(!schema) {
        return new vsc.TreeItem('ERROR!!!', vsc.TreeItemCollapsibleState.None);
      }
      const result = new vsc.TreeItem(schema.label, vsc.TreeItemCollapsibleState.None);
      result.command = {
        command: 'vscode.open',
        title: 'Open Schema',
        arguments: [element, <vsc.TextDocumentShowOptions> { preview: true }],
      };
      result.tooltip = await this._getSchemaTooltip(element);
      result.resourceUri = element;
      result.contextValue = isNative ? '' : 'editableSchema';

      return result;
  }

  private async _getCollectionTreeItem(element: vsc.Uri, isNative: boolean) {
    const result = new vsc.TreeItem(element.authority, vsc.TreeItemCollapsibleState.Collapsed);
    result.resourceUri = element;
    result.contextValue = isNative ? '' : 'editableCollection';

    return result;
  }

  private async _getSchemaTooltip(uri: vsc.Uri) {
    const collection = uri.authority;
    const id = TypeSchemeProvider.schemaIdFromUri(uri);
    const schema = await SchemaDB.getSchema(collection, id);

    if(!schema) {
      return Promise.reject(`Unable to load schema '${collection}.${id}'.`);
    }

    const result = new vsc.MarkdownString();
    result.appendMarkdown(`**${schema.label}** `);
    result.appendMarkdown(`*(${schema._id})*\n\n`);
    if(schema.description) {
      result.appendMarkdown(schema.description);
    }
    if(schema.fields) {
      result.appendMarkdown('\n***\n');
      result.appendMarkdown(schema.fields.map(field => {
        const name = field.label ?? field.key;
        const type = field.ref + (field.isArray ? '[]' : '');
        return `- ${name} *(${type})*`;
      }).join('\n'));
    }

    return result;
  }

  public async getChildren(element?: vsc.Uri | undefined): Promise<vsc.Uri[]> {
    if(!element) {
      const allNames = Array.from<string>(new Set([
        ...(await SchemaDB.getAllSchemaCollections()),
        ...vsc.workspace.workspaceFolders?.map(wsf => wsf.name) ?? []
      ]).values());

      return allNames.sort().map(collectionName => vsc.Uri.from({ scheme: TYPE_SCHEME, authority: collectionName }));
    }

    try {
      const uris = await Promise.all((await vsc.workspace.fs.readDirectory(element))
        .map(async info => {
          return {
            name: (await SchemaDB.getSchema(element.authority, info[0]))?.label ?? 'ERROR',
            uri: element.with({ path: `/${info[0]}` }),
          };
        }));

      return uris
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(el => el.uri);
    }
    catch(e) {
      return [];
    }
  }

  public getParent(element: vsc.Uri): vsc.ProviderResult<vsc.Uri> {
    return vsc.Uri.joinPath(element, '..');
  }

  // async resolveTreeItem?(item: vsc.TreeItem, element: string, token: vsc.CancellationToken): Promise<vsc.TreeItem> {
  //   throw new Error('Method not implemented.');
  // }
}