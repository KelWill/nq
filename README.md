# nq

`npm install -g node-fn-query`

```bash
cat example.json | jq -c .[] | nq '({eyeColor}) => eyeColor' # all eye color results
cat example.json | jq -c .[] | nq --filter '({favoriteFruit}) => favoriteFruit === "banana"' # filtered objects
cat example.json | jq -c .[] | nq --reduce [] '(acc, {friends}) => acc.concat(friends)' | jq -c .[] | nq '_.get("id")' | sort | uniq # list of unique friend ids. _ is lodash/fp
```

## why? `jq` needs a friend

I know there are people out there who have learned how to write complex `jq` programs, and are even later able to read the programs that they've written. `jq` is an amazing, wonderful, life-saving tool, but because I only need it every few weeks, I have major problems remembering the syntax, and I'll often need to leave the shell to deal with more complex JSON. Leaving the shell when you're in the middle of writing a pipeline or exploring some data is a real shame!

I've finally given up hope of ever learning `jq` properly, so instead I've started using `jq` to munge data into a workable state, and then manipulating it with `nodejs` functions. The core of the code to make that happen is simple:

```js
#!/usr/bin/env node
const fn = eval([].slice.call(process.argv, 2).join(" "));
require("readline")
  .createInterface({input: process.stdin})
  .on("line", (v) => console.log(fn(JSON.parse(v))));
```

Just those few lines of code stuck somewhere appropriate in your PATH can make it much easier to manipulate JSON! It's incredibly freeing to not need to look anything up or leave the shell when you have a JSON problem.

## usage

`nq --help`

`nq` only reads `stdin` line by line, so you'll almost always need to use `jq --compact` (or `jq -c`) to deal with objects, or `jq -c .[]` (to iterate through an array) to get data into an `nq` compatible format.

The default mode is mapping over the input values: `seq 1 100 | nq 'n => n * n'`, but you can change that to either `reduce` the values or `filter` the values.

  - `--reduce` (`-r`) allows you to reduce `stdin` to a single value. It takes a value as its second parameter:
    - `seq 1 100 | nq -r 0 '(sum, n) => sum + n' # returns the sum`
    - `seq 1 20 | nq -r [] '(acc, n) => acc.concat(n)' # sticks the input into an array`
  - `--filter` (`-f`) allows to filter `stdin`:
    - `seq 1 100 | nq -f '(n) => n % 2' # prints odd numbers`

By default, `nq` attempts to `JSON.parse` the input values & `JSON.stringify` the output values:

  - `--string-input` (`-i`): don't `JSON.parse` input lines. Useful if you want to use this to process strings
  - `--raw-output`: don't `JSON.stringify` output lines. Useful if you want to feed string values into another shell script

[lodash](https://lodash.com/) is included, and by default functional-style [`lodash/fp`](https://github.com/lodash/lodash/wiki/FP-Guide) is available as `_`. The more functional lodash style lends itself to writing `nq '_.get(["key", 0])'` rather than the slightly more verbose `nq '(v) => _.get(v, ["key", 0])'`.

  - `not-fp`: `_` will be regular `lodash` rather than `lodash/fp`.

- `this` will be a consistent object that starts as `{}`. Using `this` to store state is generally a sign that you should be `reducing` OR using a more fully-fleshed tool instead.

## examples

For more complex examples, let's take a look at some of the highest upvoted `jq` stackoverflow questions and answer them using `nq`.

1. [How to filter an array based on a key of an object?](https://stackoverflow.com/questions/18592173/select-objects-based-on-value-of-variable-in-object-using-jq/18608100#18608100)

Given an array of objects with locations, how do we filter them by one of their properties?

- `jq`: `jq '.[] | select(.location=="Stockholm")'`
- `nq`: `nq -f '({location}) => location === "Stockholm"'`

2. [How to filter an array based on value in inner array?](https://stackoverflow.com/questions/26701538/how-to-filter-an-array-of-objects-based-on-values-in-an-inner-array-with-jq/26701851#26701851)

Given data with a shape of `Array<{Id: string, Names: string[]}>`, filter `Id` based on the presence of a string containing `"data"` in the `Names` array.

- `jq`: `jq -r '. - map(select(.Names[] | contains ("data"))) | .[] .Id'`
- `nq`: `jq -c .[] | nq --filter '({Names}) => Names.every((n) => !n.includes("data"))' | nq -o '({Id}) => Id'`
- `nq` with a lodash functional style: `nq --filter '_.flow( _.get("Names"), _.find(n => !n.match(/data/)) )' | nq -o '_.get("Id")`)

3. [How to format multiple fields from a JSON document into a single string?](https://stackoverflow.com/questions/28164849/using-jq-to-parse-and-display-multiple-fields-in-a-json-serially/31418194#31418194)

Given data that looks like `{users: Array<{first: string, last: string}>}`, output `${first} ${last}`

- `jq`: `jq -r '.users[] | "\(.first) \(.last)"'`
- `nq`: `jq -c .users[] | nq -o '({first, last}) => `${first} ${last}`'`

Note that for all of these cases, `jq` is much more terse, is required for `nq` to even do anything at all, and if we were processing a significant amount of data, I'd expect `jq` to be much faster. `nq` is worse than `jq` in every way except offering familiar `nodejs` syntax, but familiar syntax is a big deal!
