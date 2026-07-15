import { deserialize, serialize } from "node:v8";

if (!globalThis.structuredClone) {
  Object.defineProperty(globalThis, "structuredClone", {
    configurable: true,
    value(value) {
      return deserialize(serialize(value));
    }
  });
}

const { ESLint } = await import("eslint");
const eslint = new ESLint();
const results = await eslint.lintFiles(["."]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);

if (output) {
  console.log(output);
}

const errorCount = results.reduce((count, result) => count + result.errorCount + result.fatalErrorCount, 0);
if (errorCount > 0) {
  process.exitCode = 1;
}
