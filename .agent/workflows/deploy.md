---
description: Deploy changes to GitHub and Render (auto-redeploy)
---

# Deploy FreshCart to Production

This workflow commits all changes, pushes to GitHub, and Render automatically redeploys.

// turbo-all

1. Stage all changes:
```bash
git add -A
```

2. Check what changed:
```bash
git status
```

3. Commit with a descriptive message (replace the message as needed):
```bash
git commit -m "Update: <describe changes>"
```

4. Push to GitHub (triggers Render auto-deploy):
```bash
git push origin main
```

5. Confirm deployment:
- Render will auto-detect the push and redeploy within ~1-2 minutes
- Check the live site at the Render URL
