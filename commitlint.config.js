module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      ["techradar", "create-techradar", "deps", "release"],
    ],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "sec",
        "fix",
        "bug",
        "test",
        "refactor",
        "rework",
        "ops",
        "ci",
        "cd",
        "build",
        "doc",
        "perf",
        "chore",
        "update",
      ],
    ],
  },
};
