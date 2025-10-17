import { PassThrough } from "node:stream";

export class ZipFile {
  outputStream = new PassThrough();

  addEmptyDirectory(_dir: string): void {}

  addFile(_absolutePath: string, _entryName: string): void {}

  end(): void {
    this.outputStream.end();
  }
}
