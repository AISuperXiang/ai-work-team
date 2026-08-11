"use strict";

class CliArgumentError extends Error {
  constructor(message) {
    super(message);
    this.name = "CliArgumentError";
    this.exitCode = 2;
  }
}

function parseCliArgs(argv, config) {
  const descriptors = new Map();
  const values = {};
  const positionals = [];
  const seen = new Set();

  for (const [flag, descriptor] of Object.entries(config.options || {})) {
    descriptors.set(flag, { ...descriptor, flag });
    for (const alias of descriptor.aliases || []) {
      descriptors.set(alias, { ...descriptor, flag });
    }
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    const descriptor = descriptors.get(arg);
    if (!descriptor) {
      throw new CliArgumentError(`Unknown option: ${arg}`);
    }

    const key = descriptor.key;
    if (seen.has(key)) {
      throw new CliArgumentError(`Duplicate option: ${arg}`);
    }
    seen.add(key);

    if (descriptor.type === "boolean") {
      values[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (value === undefined || value.startsWith("-")) {
      throw new CliArgumentError(`${arg} requires a value`);
    }
    index += 1;

    if (
      Array.isArray(descriptor.choices) &&
      !descriptor.choices.includes(value)
    ) {
      throw new CliArgumentError(
        `Invalid value for ${arg}: ${value}. Expected one of: ${descriptor.choices.join(", ")}`,
      );
    }
    if (descriptor.validate && !descriptor.validate(value)) {
      throw new CliArgumentError(`Invalid value for ${arg}: ${value}`);
    }
    values[key] = value;
  }

  return { options: values, positionals };
}

function assertNoConflict(options, keys, message) {
  const present = keys.filter((key) => options[key] !== undefined);
  if (present.length > 1) {
    throw new CliArgumentError(message);
  }
}

module.exports = {
  CliArgumentError,
  assertNoConflict,
  parseCliArgs,
};
