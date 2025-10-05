export type ExecutorFile = { path: string; contents: string };
export type ExecutorOutput = { project_name?: string; files: ExecutorFile[]; notes?: string[] };
