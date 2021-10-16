
export class DebugInformation {
  public readonly line: number;
  public readonly file: string;

  constructor(file: string, line: number) {
    this.file = file;
    this.line = line;
  }
}
