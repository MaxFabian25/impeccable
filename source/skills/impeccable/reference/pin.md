# Pin / Unpin

Create or remove managed project-local shortcuts for Impeccable root commands.

## What Pin Does

`pin` writes a lightweight redirect skill at `skills/<command>/SKILL.md`. For example, `$impeccable pin craft` creates `$craft` as a shortcut for `$impeccable craft`.

The generated skill is intentionally small. It tells Codex to load the installed Impeccable root skill and follow the matching mode with the user's same arguments.

## What Unpin Does

`unpin` removes only a shortcut created by this script. It refuses to remove any skill file that does not contain Impeccable's managed pin marker.

## Valid Commands

Valid pin targets are root-only commands that do not already ship as standalone Codex skills:

- `craft`
- `teach`
- `document`
- `extract`

Do not pin standalone commands such as `$audit`, `$polish`, or `$layout`. They already ship directly in the Codex plugin.

## Safety Rules

- Write only to `skills/<command>/SKILL.md` in the current project.
- Never write `.claude`, `.cursor`, `.agents`, `.gemini`, or other non-Codex harness directories.
- Never overwrite an existing skill unless it has the Impeccable managed pin marker.
- Never remove an existing skill unless it has the Impeccable managed pin marker.

## Usage

```bash
node {{scripts_path}}/pin.mjs pin <command>
node {{scripts_path}}/pin.mjs unpin <command>
```

After running, report stdout or stderr exactly enough that the user knows what changed or why the script refused.
