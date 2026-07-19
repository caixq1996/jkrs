import path from "node:path";

export interface ProjectPaths {
  root: string;
  tasksDir: string;
  stateFile: string;
}

export function resolveProjectPaths(outputDir: string, cwd = process.cwd()): ProjectPaths {
  const root = path.resolve(cwd, outputDir);
  return {
    root,
    tasksDir: path.join(root, "tasks"),
    stateFile: path.join(root, "state.json"),
  };
}
