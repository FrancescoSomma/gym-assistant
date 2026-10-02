---
name: sdd-nested
description: Execute a whole implementation plan in one session with three agent levels (plan orchestrator → per-task orchestrator → SDD workers). Use only when the user invokes /sdd-nested with a plan path.
disable-model-invocation: true
---

Execute the plan at: $ARGUMENTS

Load superpowers:subagent-driven-development with the Skill tool and follow it with exactly one change: you do not run "The Task Loop" yourself. For each task you delegate the whole loop to the `sdd-task-orchestrator` subagent.

## What you (main session) do

1. **Setup**, exactly as the SDD skill says: worktree, workspace (`scripts/sdd-workspace`), ledger check or creation, read the plan and its spec once, pre-flight conflict scan with rulings in the ledger, one todo per task.
2. **Resume logic.** Tasks with a `Task <N>: complete` line in the ledger are done; start from the first task without one. If a task's last ledger line is a fix round, dispatch its orchestrator stating that the task is mid fix-loop.
3. **For each remaining task, in order, one at a time:**
   - Dispatch `sdd-task-orchestrator` with: working directory (absolute), plan path, workspace path, task number(s), the plan's Global Constraints (verbatim), the pre-flight rulings that concern this task, and every CARRY_FORWARD item from earlier tasks that touches this task. Nothing else from earlier tasks.
   - Batch small same-shape tasks into one dispatch, as the SDD skill prescribes.
   - Wait for its completion with bounded waits, as the SDD skill says. Never run two task orchestrators in parallel.
   - Verify that the ledger has the `Task <N>: complete` line and that `git log` shows the commits. If not, re-dispatch the orchestrator for the same task, stating what is missing.
   - Keep only the return contract in your context. Do not read report files or diffs unless STATUS is STOPPED.
   - Mark the todo complete. No check-ins with the user between tasks.
4. **If STATUS is STOPPED:** stop and present the reason to the user.
5. **Final Review and Finish**, exactly as the SDD skill says: final whole-branch review on the most capable model, one fix wave, and the "Rulings I made" list built from ALL `Ruling:` lines in the ledger, including those written by task orchestrators.

## Never

- Implement, fix or review code yourself.
- Dispatch implementers or task reviewers directly: per-task work belongs to the task orchestrator. The only reviewer you dispatch is the final whole-branch reviewer.
- Paste earlier tasks' summaries into a dispatch beyond the relevant CARRY_FORWARD items.
