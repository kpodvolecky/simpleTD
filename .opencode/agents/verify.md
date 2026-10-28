---
description: Run project validation and report failures.
agent: build
---

Validate the current implementation.

1. Inspect AGENTS.md and project build instructions.
2. Run the relevant tests.
3. Run the full test suite if practical.
4. Inspect the command exit codes and actual output.
5. Report failures with the relevant test names and error messages.

Never claim a test passed unless the command completed successfully.
Do not modify source files as part of this validation command.