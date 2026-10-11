# Security policy

## Supported versions

Security fixes are released for the latest version of `@g_package/jest-cucumber-fusion` on npm, which is version 3. Older majors, version 2 and the original `jest-cucumber-fusion` 0.8.x, receive none: [Migrating to version 3](./docs/Migrating.md) shows how to move.

| Version             | Security fixes |
| ------------------- | -------------- |
| 3.x, latest release | yes            |
| 2.x and earlier     | no             |

## Reporting a vulnerability

**Do not open a public issue for a vulnerability.** Report it privately through GitHub instead:

1. Go to the repository's [Security tab](https://github.com/gotreasa/jest-cucumber-fusion/security) and choose **Report a vulnerability**, or open the [private report form](https://github.com/gotreasa/jest-cucumber-fusion/security/advisories/new) directly.
2. Describe the problem, the version affected, and how to reproduce it. A feature file and step definitions that show it help most, as they do for any bug.

Only you and the maintainers can see the report. GitHub's guide to [privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) explains the form.

## What happens next

The maintainers reply in the report, work on a fix there in private, and agree with you when to make the problem public. A fix is released as a new patch or minor version, and the advisory is published with it, crediting you unless you would rather not be named.

## Scope

This policy covers the code this package publishes: `src/`, the CommonJS build in `dist/`, and its runtime dependencies (`@cucumber/gherkin`, `@cucumber/messages`, `@cucumber/tag-expressions` and `callsites`). A vulnerability in one of those dependencies is best reported to its own project as well.

Development dependencies are not shipped to anyone who installs the package; Dependabot proposes updates for them.

Releases are published from CI with npm provenance, so you can check that a version was built from this repository: run `npm audit signatures` in a project that installs it.
