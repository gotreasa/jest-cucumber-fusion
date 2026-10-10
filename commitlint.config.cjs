// semantic-release derives each release from the commit types, so every commit message must
// follow Conventional Commits. The commit-msg hook runs this check.
module.exports = {
  extends: ["@commitlint/config-conventional"],
};
