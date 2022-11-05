import * as vsc from 'vscode';
import { TYPE_SCHEME } from './schema-core';
import { SchemaDB } from './schema-db';

export class TypeSchemeProvider implements vsc.FileSystemProvider {
  public constructor(private _context: vsc.ExtensionContext) {
    _context.subscriptions.push(vsc.workspace.registerFileSystemProvider(TYPE_SCHEME, this));
  }

  private _onDidChangeFile = new vsc.EventEmitter<vsc.FileChangeEvent[]>();
  public onDidChangeFile = this._onDidChangeFile.event;

  private _eventBuffer: vsc.FileChangeEvent[] = [];
  private _eventFiringTimer?: NodeJS.Timer;
  private readonly _eventFiringDelay = 25;

  private _getWorkspaceFolderFromName(workspaceFolderName: string) {
    return vsc.workspace.workspaceFolders?.find(wsf => wsf.name === workspaceFolderName);
  }

  public static schemaIdFromUri(uri: vsc.Uri) {
    return uri.path.substring(1);
  }

  public static isCollection(uri: vsc.Uri) {
    return !uri.path;
  }
  
  public static isSchema(uri: vsc.Uri) {
    return !!uri.path;
  }

  public watch(uri: vsc.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vsc.Disposable {
    // Ignore because we send all.
    return new vsc.Disposable(() => {});
  }

  async stat(uri: vsc.Uri): Promise<vsc.FileStat> {
    if(TypeSchemeProvider.isSchema(uri)) {
      const schema = await SchemaDB.getSchema(uri.authority, TypeSchemeProvider.schemaIdFromUri(uri));
      
      if(!schema) {
        throw vsc.FileSystemError.FileNotFound();
      }

      if(!schema.createdAt || !schema.updatedAt) {
        throw vsc.FileSystemError.FileNotFound(`Data for ${uri.toString(true)} appears to be corrupted.`);
      }

      return {
        ctime: schema.createdAt,
        mtime: schema.updatedAt,
        size: JSON.stringify(schema).length,
        type: vsc.FileType.File,
      };
    }

    // It's a collection so return stats from file in workspace folder.
    const wsf = this._getWorkspaceFolderFromName(uri.path);
    if(!wsf) {
      throw vsc.FileSystemError.FileNotFound();
    }

    return vsc.workspace.fs.stat(wsf.uri);
  }

  async readDirectory(uri: vsc.Uri): Promise<[string, vsc.FileType][]> {
    if(!TypeSchemeProvider.isCollection(uri)) {
      throw vsc.FileSystemError.FileNotFound();
    }

    const schemas = await SchemaDB.getAllSchemasFromCollection(uri.authority);
    if(!schemas) {
      throw vsc.FileSystemError.FileNotFound();
    }
    
    return schemas.map(schema => [schema._id, vsc.FileType.File]);
  }

  createDirectory(uri: vsc.Uri): Promise<void> {
    throw new Error('createDirectory() method not implemented.');
  }

  async readFile(uri: vsc.Uri): Promise<Uint8Array> {
    const schema = await SchemaDB.getSchema(uri.authority, TypeSchemeProvider.schemaIdFromUri(uri));
    
    if(!schema) {
      throw vsc.FileSystemError.FileNotFound();
    }

    return Buffer.from(JSON.stringify(schema, undefined, 2));
  }

  async writeFile(uri: vsc.Uri, content: Uint8Array, options: { readonly create: boolean; readonly overwrite: boolean; }): Promise<void> {
    const isSchemaExisting = await SchemaDB.isExisting(uri.authority, { _id: TypeSchemeProvider.schemaIdFromUri(uri) });
    if(!options.create && !isSchemaExisting) {
      throw vsc.FileSystemError.FileNotFound();
    }

    const obj = JSON.parse(content.toString());
    await SchemaDB.setSchema(uri.authority, obj, true, options.overwrite);
    await vsc.commands.executeCommand('smithy.refreshSchemaView');
    //this._onDidChangeFile.fire([{ type: isSchemaExisting ? vsc.FileChangeType.Changed : vsc.FileChangeType.Created, uri }]);
    this._fireSoon({ type: isSchemaExisting ? vsc.FileChangeType.Changed : vsc.FileChangeType.Created, uri });
  }

  private _fireSoon(...events: vsc.FileChangeEvent[]): void {
    this._eventBuffer.push(...events);

    if (this._eventFiringTimer) {
      clearTimeout(this._eventFiringTimer);
    }

    this._eventFiringTimer = setTimeout(() => {
      this._onDidChangeFile.fire(this._eventBuffer);
      this._eventBuffer.length = 0;
    }, this._eventFiringDelay);
  }

  delete(uri: vsc.Uri, options: { readonly recursive: boolean; }): Promise<void> {
    throw new Error('delete() method not implemented.');
  }

  rename(oldUri: vsc.Uri, newUri: vsc.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
    throw new Error('rename() method not implemented.');
  }

  copy?(source: vsc.Uri, destination: vsc.Uri, options: { readonly overwrite: boolean; }): Promise<void> {
    throw new Error('copy() method not implemented.');
  }
}