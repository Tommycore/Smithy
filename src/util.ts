import * as vsc from 'vscode';

export function getWorkspaceFolderFromNameSync(name: string) {
  const result = vsc.workspace.workspaceFolders?.find(wsf => wsf.name === name);
  if(!result) {
    throw new Error(`${name} is not an active workspace folder.`);
  }

  return result;
}

export async function getWorkspaceFolderFromName(name: string) {
  const result = vsc.workspace.workspaceFolders?.find(wsf => wsf.name === name);
  if(!result) {
    return Promise.reject(`${name} is not anactive workspace folder.`);
  }

  return Promise.resolve(result);
}

export function getWorkspaceFolderFromFileSync(uri: vsc.Uri) {
  const relPath = vsc.workspace.asRelativePath(uri, true);
  if(relPath.includes(':')) {
    throw new Error(`'${uri.toString(true)}' is not in an active workspace folder.`);
  }
  
  const wsfName = relPath.substring(0, relPath.indexOf('/'));
  return getWorkspaceFolderFromNameSync(wsfName);
}

export async function getWorkspaceFolderFromFile(uri: vsc.Uri) {
  const relPath = vsc.workspace.asRelativePath(uri, true);
  if(relPath.includes(':')) {
    return Promise.reject(`'${uri.toString(true)}' is not in an active workspace folder.`);
  }
  
  const wsfName = relPath.substring(0, relPath.indexOf('/'));
  return getWorkspaceFolderFromName(wsfName);
}

export function getFileName(uri: vsc.Uri) {
  return uri.path.substring(uri.path.lastIndexOf('/') + 1);
}

export function removeLeadingSlash(path: string) {
  return path.replace(/^\//, '');
}

export function getUriFromRelativePathSync(relativePath: string) {
  const normalisedPath = removeLeadingSlash(relativePath);
  const slashIndex = normalisedPath.indexOf('/');
  const wsfName = normalisedPath.substring(0, slashIndex);
  const wsf = getWorkspaceFolderFromNameSync(wsfName);

  return vsc.Uri.joinPath(wsf.uri, normalisedPath.substring(slashIndex + 1));
}

export async function getUriFromRelativePath(relativePath: string) {
  const normalisedPath = removeLeadingSlash(relativePath);
  const slashIndex = normalisedPath.indexOf('/');
  const wsfName = normalisedPath.substring(0, slashIndex);
  return getWorkspaceFolderFromName(wsfName)
    .then(wsf => vsc.Uri.joinPath(wsf.uri, normalisedPath.substring(slashIndex + 1)));
}

export async function readObjectFromFile<T>(uri: vsc.Uri): Promise<T|undefined>
{
  return vsc.workspace.fs.readFile(uri)
    .then(buffer => buffer.toString(), reason => Promise.resolve(undefined))
    .then(content => {
      if(typeof content !== 'string') {
        return Promise.resolve(undefined);
      }
      try {
        return JSON.parse(content) as T;
      }
      catch(e) {
        vsc.window.showWarningMessage('Unable to load module file.', uri.toString(true));
        return Promise.resolve(undefined);
      }
    }, reason => Promise.resolve(undefined));
}