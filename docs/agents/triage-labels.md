# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

For this local-markdown tracker, "applying a label" means writing the string into the `Status:` line of the issue file.

Edit the right-hand column to match whatever vocabulary you actually use.

## Workflow states

The five roles above describe an issue's *readiness for pickup*. An issue being actively worked also carries a *workflow* state, written into the same `Status:` line. `/slice` drives these transitions:

| State         | Meaning                                                        |
| ------------- | ------------------------------------------------------------- |
| `in-progress` | An agent has picked the issue up and is implementing it       |
| `in-review`   | Implementation is committed; awaits human testing / review    |

A slice moves `ready-for-agent` → `in-progress` → (commit) → `in-review`. Only a human advances an issue past `in-review`.
