import * as vsc from 'vscode';
import * as util from './util';

interface IUriTracker { trackedUris: RelativeUriMap; }
/**
 * Key is the relative path. Can contain workspace folder but doesn't have to.
 */
export type RelativeUriMap = Record<string, vsc.Uri>;

export class UriTree {
  constructor(private readonly _tracker: IUriTracker) {}

  public getChildren(path: string): string[] {
    const names = new Set<string>();
    Object.keys(this._tracker.trackedUris)
      .filter(key => {
        return key.startsWith(util.removeLeadingSlash(path));
      })
      .map(key => {
        if(key === path) {
          return;
        }
        const relName = key.substring(path.length).replace(/^\//, '');
        const nameBits = relName.split('/');
        const name = nameBits[0];
        names.add(name);
      });
    
    return [...names].map(el => {
      const fullPath = path + '/' + el;
      return {
        name: el,
        fullPath,
        hasChildren: this.hasChildren(fullPath)
      };
    }).sort((a, b) => {
      if(a.hasChildren === b.hasChildren) {
        return a.name.localeCompare(b.name);
      }
      return a.hasChildren ? -1 : 1;
    }).map(el => el.fullPath);
  }

  public hasChildren(path: string): boolean {
    return Object.keys(this._tracker.trackedUris)
      // Find an entry that starts like the path, but goes on after that, i.e.:
      // path = /some/path/to
      // valid child: some/path/to/file.tab
      // invalid child: some/path/to
      .findIndex(key => {
        const pathWithoutLeadingSlash = path.replace(/^\//, '');
        return key.startsWith(pathWithoutLeadingSlash) &&
          key.length !== pathWithoutLeadingSlash.length;
      }) !== -1;
  }

  public getBaseTreeItem(element: string) {
    return new vsc.TreeItem(element.substring(element.lastIndexOf('/') + 1),
      this.hasChildren(element) ? vsc.TreeItemCollapsibleState.Collapsed : vsc.TreeItemCollapsibleState.None);
  }

  public getParentElement(element: string) {
    const path = (element[0] !== '/') ? '/' + element : element;
    return path.substring(0, path.lastIndexOf('/'));
  }
}