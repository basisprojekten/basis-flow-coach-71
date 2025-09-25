#!/bin/bash

# Branch Cleanup Script for basisprojekten/basis-flow-coach-71
# This script deletes all branches except main

set -e

REPO_OWNER="basisprojekten"
REPO_NAME="basis-flow-coach-71"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧹 Branch Cleanup Script for ${REPO_OWNER}/${REPO_NAME}${NC}"
echo "=========================================================="

# Branches to delete (all except main)
BRANCHES_TO_DELETE=(
    "codex/refactor-ai-agent-prompt-generation"
    "copilot/fix-707c7356-2332-4f51-b997-c6e3bd0092e6"
    "test2codex"
    "test3"
    "testcodex"
    "testfixexercises"
    "webcodextest"
    "webcodextest2"
)

echo -e "${YELLOW}⚠️  WARNING: This will permanently delete the following branches:${NC}"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
    echo "  - $branch"
done
echo ""

# Confirmation prompt
read -p "Are you sure you want to continue? Type 'yes' to confirm: " -r
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo -e "${RED}❌ Operation cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Starting branch cleanup...${NC}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Switch to main branch
echo -e "${BLUE}📍 Switching to main branch...${NC}"
if ! git checkout main; then
    echo -e "${RED}❌ Error: Could not switch to main branch${NC}"
    exit 1
fi

# Fetch latest changes
echo -e "${BLUE}📥 Fetching latest changes...${NC}"
git fetch origin

# Delete remote branches
echo -e "${BLUE}🗑️  Deleting remote branches...${NC}"
DELETED_COUNT=0
FAILED_COUNT=0

for branch in "${BRANCHES_TO_DELETE[@]}"; do
    echo -n "  Deleting $branch... "
    if git push origin --delete "$branch" 2>/dev/null; then
        echo -e "${GREEN}✅ Success${NC}"
        ((DELETED_COUNT++))
    else
        echo -e "${YELLOW}⚠️  Failed (may not exist)${NC}"
        ((FAILED_COUNT++))
    fi
done

# Delete local branches
echo -e "${BLUE}🗑️  Deleting local branches...${NC}"
for branch in "${BRANCHES_TO_DELETE[@]}"; do
    echo -n "  Deleting local $branch... "
    if git branch -D "$branch" 2>/dev/null; then
        echo -e "${GREEN}✅ Success${NC}"
    else
        echo -e "${YELLOW}⚠️  Not found locally${NC}"
    fi
done

# Clean up remote tracking branches
echo -e "${BLUE}🧹 Cleaning up remote tracking branches...${NC}"
git remote prune origin

# Verify cleanup
echo -e "${BLUE}🔍 Verifying cleanup...${NC}"
echo "Remaining branches:"
git branch -a

echo ""
echo -e "${GREEN}✅ Branch cleanup completed!${NC}"
echo -e "   Successfully deleted: ${DELETED_COUNT} branches"
echo -e "   Failed/Not found: ${FAILED_COUNT} branches"

echo ""
echo -e "${YELLOW}📱 Don't forget to clean up any associated GitHub Codespaces:${NC}"
echo "   1. Go to https://github.com/codespaces"
echo "   2. Delete any codespaces associated with the deleted branches"
echo ""
echo "   Or use GitHub CLI:"
echo "   gh codespace list --repo ${REPO_OWNER}/${REPO_NAME}"
echo "   gh codespace delete -c <codespace-name>"

echo ""
echo -e "${GREEN}🎉 Repository cleanup is complete!${NC}"