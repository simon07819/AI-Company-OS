import path from "path";

export function dataRoot() {
  return path.resolve(
    process.env.AI_COMPANY_DATA_DIR
      ?? process.env.AI_COMPANY_RUNTIME_DIR
      ?? path.join(process.cwd(), "data"),
  );
}

export function resolveDataPath(fileName: string) {
  const root = dataRoot();
  const target = path.resolve(root, fileName);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Runtime store path escaped data root");
  }
  return target;
}
