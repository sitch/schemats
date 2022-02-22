import { promises } from "fs";
import { relative } from "path";

export const relpath = (path: string): string => relative(process.cwd(), path);

export const writeRelFileAsync = async (content: string, output: string) => {
  const path = relpath(output);
  await promises.writeFile(path, content, "utf8");
};
