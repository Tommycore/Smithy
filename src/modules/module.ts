export class Module {
  public id: string = '';
  public title: string = '';
  public description: string = '';
  public version: { major: number, minor: number, fix: number } = { major: 0, minor: 0, fix: 0 };
  public authors: { name: string }[] = [];

}

export function getManifest(module: Module) {
  return {
    id: module.id,
    title: module.title,
    authors: module.authors,
    description: module.description,
    version: `${module.version.major}.${module.version.minor}.${module.version.fix}`,
    compatibility: {
      minimum: 10,
      verified: 10,
    },
  };
}