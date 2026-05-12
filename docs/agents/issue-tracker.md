# Issue Tracker

**Type**: GitHub Issues

**Repository**: `IcePointGH/FeelingYourselfDiary`

**CLI**: [`gh`](https://cli.github.com/) — GitHub CLI.

## Usage

Skills that interact with the issue tracker (`to-issues`, `triage`, `to-prd`, `qa`) use `gh issue` commands:

```bash
gh issue list --repo IcePointGH/FeelingYourselfDiary
gh issue create --repo IcePointGH/FeelingYourselfDiary --title "..." --body "..."
gh issue view --repo IcePointGH/FeelingYourselfDiary <number>
gh issue edit --repo IcePointGH/FeelingYourselfDiary <number> --add-label "..."
```

## Authentication

Ensure `gh auth status` succeeds before using issue-tracker skills. Run `gh auth login` if not authenticated.
