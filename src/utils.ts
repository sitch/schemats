import { promises } from "fs";
import { join, relative } from "path";
import { readFileSync } from "fs";

export const projectDir = () => {
  return join(__dirname, "..");
};

export const relProjectDir = (path: string): string => {
  return join(projectDir(), path);
};
export const callerRelPath = (path: string): string => {
  return relative(process.cwd(), path);
};

export const writeRelFileAsync = async (content: string, path: string) => {
  await promises.writeFile(callerRelPath(path), content, "utf8");
};

export const readSQL = (path: string) => {
  return readFileSync(relProjectDir(path)).toString("utf8");
};

export const jsonEq = (left: any, right: any): boolean => {
  const leftEncoded = JSON.stringify(left);
  const rightEncoded = JSON.stringify(right);
  return leftEncoded == rightEncoded;
};
