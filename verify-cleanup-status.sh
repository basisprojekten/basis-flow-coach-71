#!/bin/bash

# Verification script to check branch cleanup status
# This script checks what branches exist and what cleanup is needed

set -e

REPO_OWNER="basisprojekten"
REPO_NAME="basis-flow-coach-71"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Branch Cleanup Status Check for ${REPO_OWNER}/${REPO_NAME}${NC}"
echo "=============================================================="

# Expected branches to be deleted
EXPECTED_DELETIONS=(
    "codex/refactor-ai-agent-prompt-generation"
    "copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6"
    "test2codex"
    "test3"
    "testcodex"
    "testfixexercises"
    "webcodextest"
    "webcodextest2"
)

echo -e "${BLUE}📋 Current branch status:${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Fetch latest information
echo -e "${BLUE}📥 Fetching latest repository information...${NC}"
git fetch origin --prune

# Show current branches
echo -e "${BLUE}🌿 Current branches:${NC}"
ALL_BRANCHES=$(git branch -r | grep -v HEAD | sed 's/origin\///' | tr -d ' ')

if [ -z "$ALL_BRANCHES" ]; then
    echo -e "${YELLOW}⚠️  No remote branches found${NC}"
else
    for branch in $ALL_BRANCHES; do
        if [ "$branch" = "main" ]; then
            echo -e "  ${GREEN}✅ $branch (should remain)${NC}"
        else
            echo -e "  ${RED}❌ $branch (should be deleted)${NC}"
        fi
    done
fi

echo ""

# Check cleanup status
NEEDS_CLEANUP=false
CLEANUP_NEEDED=()

for branch in "${EXPECTED_DELETIONS[@]}"; do
    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        NEEDS_CLEANUP=true
        CLEANUP_NEEDED+=("$branch")
    fi
done

if [ "$NEEDS_CLEANUP" = true ]; then
    echo -e "${RED}❌ Cleanup still needed for the following branches:${NC}"
    for branch in "${CLEANUP_NEEDED[@]}"; do
        echo "  - $branch"
    done
    echo ""
    echo -e "${YELLOW}📝 To perform cleanup, run:${NC}"
    echo "  ./cleanup-branches.sh"
    echo ""
    echo -e "${YELLOW}📖 Or follow the manual instructions in:${NC}"
    echo "  BRANCH_CLEANUP_GUIDE.md"
else
    echo -e "${GREEN}✅ All expected branches have been cleaned up!${NC}"
    echo -e "${GREEN}✅ Only the main branch remains.${NC}"
fi

echo ""

# Check for codespaces if gh is available and authenticated
if command -v gh &> /dev/null; then
    echo -e "${BLUE}📱 Checking for codespaces...${NC}"
    if gh auth status &> /dev/null; then
        CODESPACES=$(gh codespace list --repo "$REPO_OWNER/$REPO_NAME" --json name --jq '.[].name' 2>/dev/null || echo "")
        if [ -z "$CODESPACES" ]; then
            echo -e "${GREEN}✅ No codespaces found${NC}"
        else
            echo -e "${YELLOW}⚠️  Found codespaces that may need cleanup:${NC}"
            echo "$CODESPACES" | while read -r codespace; do
                echo "  - $codespace"
            done
        fi
    else
        echo -e "${YELLOW}⚠️  GitHub CLI not authenticated - cannot check codespaces${NC}"
        echo "   Run 'gh auth login' to authenticate"
    fi
else
    echo -e "${YELLOW}⚠️  GitHub CLI not available - cannot check codespaces${NC}"
fi

echo ""
echo -e "${BLUE}📊 Summary:${NC}"
if [ "$NEEDS_CLEANUP" = true ]; then
    echo -e "  Status: ${RED}Cleanup required${NC}"
    echo -e "  Branches to delete: ${#CLEANUP_NEEDED[@]}"
else
    echo -e "  Status: ${GREEN}Cleanup complete${NC}"
    echo -e "  All branches except main have been removed"
fi