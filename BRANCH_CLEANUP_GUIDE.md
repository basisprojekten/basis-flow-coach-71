# Branch and Codespace Cleanup Guide

This guide provides instructions to delete all branches except `main` and clean up associated codespaces in the `basisprojekten/basis-flow-coach-71` repository.

## ⚠️ Important Warning

**This is a destructive operation that will permanently delete all branches except `main`. Ensure that any important work has been merged to main before proceeding.**

## Branches to be Deleted

The following branches have been identified for deletion:

- `codex/refactor-ai-agent-prompt-generation`
- `copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6`
- `test2codex`
- `test3`
- `testcodex`
- `testfixexercises`
- `webcodextest`
- `webcodextest2`

## Method 1: Using Git Commands (Command Line)

### Prerequisites
- Git installed and configured
- Push access to the repository
- Currently on the `main` branch

### Steps

1. **Switch to main branch** (if not already there):
   ```bash
   git checkout main
   ```

2. **Delete remote branches**:
   ```bash
   git push origin --delete "codex/refactor-ai-agent-prompt-generation"
   git push origin --delete "copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6"
   git push origin --delete "test2codex"
   git push origin --delete "test3"
   git push origin --delete "testcodex"
   git push origin --delete "testfixexercises"
   git push origin --delete "webcodextest"
   git push origin --delete "webcodextest2"
   ```

3. **Delete local branches** (if they exist):
   ```bash
   git branch -D "codex/refactor-ai-agent-prompt-generation" 2>/dev/null || echo "Local branch not found"
   git branch -D "copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6" 2>/dev/null || echo "Local branch not found"
   git branch -D "test2codex" 2>/dev/null || echo "Local branch not found"
   git branch -D "test3" 2>/dev/null || echo "Local branch not found"
   git branch -D "testcodex" 2>/dev/null || echo "Local branch not found"
   git branch -D "testfixexercises" 2>/dev/null || echo "Local branch not found"
   git branch -D "webcodextest" 2>/dev/null || echo "Local branch not found"
   git branch -D "webcodextest2" 2>/dev/null || echo "Local branch not found"
   ```

4. **Clean up remote tracking branches**:
   ```bash
   git remote prune origin
   ```

5. **Verify cleanup**:
   ```bash
   git branch -a
   ```

## Method 2: Using GitHub CLI

### Prerequisites
- GitHub CLI installed and authenticated (`gh auth login`)
- Access to the repository

### Steps

1. **List all branches** (to verify):
   ```bash
   gh api repos/basisprojekten/basis-flow-coach-71/branches --jq '.[].name'
   ```

2. **Delete branches using GitHub CLI**:
   ```bash
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/codex/refactor-ai-agent-prompt-generation
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/test2codex
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/test3
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/testcodex
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/testfixexercises
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/webcodextest
   gh api --method DELETE repos/basisprojekten/basis-flow-coach-71/git/refs/heads/webcodextest2
   ```

## Method 3: Using GitHub Web Interface

1. Go to https://github.com/basisprojekten/basis-flow-coach-71
2. Click on the branches dropdown (usually shows the current branch name)
3. For each branch to be deleted:
   - Find the branch in the list
   - Click the trash/delete icon next to the branch name
   - Confirm the deletion

## Codespace Cleanup

### Using GitHub Web Interface

1. Go to https://github.com/codespaces
2. Look for any codespaces associated with the deleted branches
3. Delete them by clicking the menu (three dots) and selecting "Delete"

### Using GitHub CLI

1. **List codespaces**:
   ```bash
   gh codespace list --repo basisprojekten/basis-flow-coach-71
   ```

2. **Delete each codespace** (replace `<codespace-name>` with actual name):
   ```bash
   gh codespace delete -c <codespace-name>
   ```

## Verification

After completing the cleanup, verify that only the `main` branch remains:

### Using Git:
```bash
git branch -a
```

### Using GitHub CLI:
```bash
gh api repos/basisprojekten/basis-flow-coach-71/branches --jq '.[].name'
```

### Using GitHub Web Interface:
Visit https://github.com/basisprojekten/basis-flow-coach-71 and check the branches dropdown.

## Expected Result

After successful cleanup:
- Only the `main` branch should exist
- No codespaces should be associated with deleted branches
- The repository should be clean and ready for future development

## Troubleshooting

- **Permission denied**: Ensure you have admin or push access to the repository
- **Branch not found**: Some branches might already be deleted or merged
- **Protected branches**: If any branches are protected, you'll need to remove protection first in repository settings

## Note

This cleanup was identified and documented as part of repository maintenance. The deleted branches contained various test and development work that should be consolidated or is no longer needed.