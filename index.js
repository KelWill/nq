#!/usr/bin/env node

const yargs = require("yargs");
const readline = require("readline");

const argv = yargs
  .option("reduce", {
    alias: "r",
    description: "reduce stdn to a single value",
    type: "string",
  })
  .option("filter", {
    alias: "f",
    type: "boolean",
    description: "filter stdn by a predicate",
  })
  .option("not-fp", {
    description: "_ will be lodash rather than lodash/fp",
    type: "boolean",
  })
  .option("string-input", {
    alias: "i",
    description: "Don't JSON.parse input lines",
    type: "boolean",
  })
  .option("string-output", {
    alias: "o",
    description: "Don't JSON.stringify output lines",
    type: "boolean",
  })
  .help()
  .alias("help", "h").argv;

const FILTER = "filter";
const REDUCE = "reduce";
const MAP = "map";

function getMethod(args) {
  if (args.reduce && args.filter) {
    throw new Error("cannot specify both 'reduce' and 'filter'");
  }

  if (args.reduce) return REDUCE;
  if (args.filter) return FILTER;
  return MAP;
}

const method = getMethod(argv);
const shouldParseJSON = !argv["string-input"];

global._ = argv["not-fp"] ? require("lodash") : require("lodash/fp");

const context = {};

if (!argv._[0]) {
  throw new Error("unable to find function to run? did you provide an invalid option? run nq --help to see available options");
}
let fn = eval(argv._[0])
if (typeof fn !== "function") {
  throw new Error(`${fn} is a '${typeof fn}' not a function`);
}
fn = fn.bind(context);

const rl = readline.createInterface({
  input: process.stdin,
});

let acc;
if (method === REDUCE) {
  acc = JSON.parse(argv.reduce);
}

function handleOutput(v) {
  if (argv["string-output"]) console.log(v);
  else console.log(JSON.stringify(v));
}

rl.on("line", (v) => {
  if (shouldParseJSON) v = JSON.parse(v);

  switch (method) {
    case REDUCE:
      acc = fn(acc, v);
      return;
    case FILTER:
      if (fn(v)) handleOutput(v);
      return;
    case MAP:
      handleOutput(fn(v));
      return;
    default:
      throw new Error(`unhandled method ${method}`);
  }
});

rl.on("close", () => {
  if (method === REDUCE) handleOutput(acc);
});
