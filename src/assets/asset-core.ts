import * as vsc from 'vscode';
import { AssetTracker } from './asset-tracker';

export async function initialiseAssetModule(context: vsc.ExtensionContext) {
  const assetTracker = await AssetTracker.initialise(context);
}