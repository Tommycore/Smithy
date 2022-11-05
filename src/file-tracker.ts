import * as vsc from 'vscode';

export class FileTracker extends vsc.Disposable {
  private constructor(
    public readonly filterExp: RegExp
  ) {
    super(() => this._disposeListeners());

    this._listeners = vsc.Disposable.from(
      vsc.workspace.onDidCreateFiles((e: vsc.FileCreateEvent) => this._processUris([...e.files], uris => this._addFileToList(uris))),
      vsc.workspace.onDidDeleteFiles((e: vsc.FileDeleteEvent) => this._processUris([...e.files], uris => this._removeFileFromList(uris))),
      vsc.workspace.onDidRenameFiles((e: vsc.FileRenameEvent) => {
        this._processUris(e.files.map(el => el.oldUri), uris => this._removeFileFromList(uris));
        this._processUris(e.files.map(el => el.newUri), uris => this._addFileToList(uris));
      }),
      vsc.workspace.onDidSaveTextDocument((e: vsc.TextDocument) => this._processUris([e.uri], uris => this._onEdit.fire(uris))),
      vsc.workspace.onDidChangeWorkspaceFolders((e: vsc.WorkspaceFoldersChangeEvent) => {
        e.added.map(folder => this._seepThroughWorkspaceFolder(folder, uris => this._addFileToList(uris)));
        e.removed.map(folder => this._seepThroughWorkspaceFolder(folder, uris => this._removeFileFromList(uris)));
      })
    );
  }

  private _listeners: vsc.Disposable;

  private _onAdd = new vsc.EventEmitter<vsc.Uri[]>();
  public onAdd = this._onAdd.event;

  private _onDelete = new vsc.EventEmitter<vsc.Uri[]>();
  public onDelete = this._onDelete.event;

  private _onEdit = new vsc.EventEmitter<vsc.Uri[]>();
  public onEdit = this._onEdit.event;

  private readonly _allUris = new Set<string>();
  public get trackedUris() { return [...this._allUris.values()]; }

  /**
   * Get a new tracker via this method. Once it returns,
   * the tracker has already made it's initial sweep
   * and build up a library of files.
   * @param filterExp Track any file which's path passes through this regex.
   * @returns A new FileTracker instance.
   */
  public static async createTracker(filterExp: RegExp) {
    const tracker = new FileTracker(filterExp);

    await Promise.all(vsc.workspace.workspaceFolders?.map(folder => tracker._seepThroughWorkspaceFolder(folder, uris => tracker._addFileToList(uris, true))) ?? []);

    return tracker;
  }

  private async _seepThroughWorkspaceFolder(folder: vsc.WorkspaceFolder, action: (uris: vsc.Uri[]) => void) {
    action(await vsc.workspace.findFiles(new vsc.RelativePattern(folder, '**/*')));
  }

  private _addFileToList(uris: vsc.Uri[], isSilent = false) {
    const filtered = this._filter(uris);
    filtered.map(uri => this._allUris.add(uri.toString()));
    if(!isSilent) {
      this._onAdd.fire(filtered);
    }
  }

  private _removeFileFromList(uris: vsc.Uri[], isSilent = false) {
    const filtered = this._filter(uris);
    filtered.map(uri => this._allUris.delete(uri.toString()));
    if(!isSilent) {
      this._onDelete.fire(filtered);
    }
  }

  private _filter(uris: vsc.Uri[]) {
    return uris.filter(uri => this.filterExp.test(uri.path));
  }

  private _processUris(uris: vsc.Uri[], action: FileAction) {
    action(this._filter(uris));
  }

  private _disposeListeners() {
    this._listeners.dispose();
  }
}

type FileAction = (uris: vsc.Uri[]) => void;