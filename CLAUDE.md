# Claude Code Configuration

## Git Configuration
- Repository: https://github.com/huckfinne-a/toeqbank.git
- GitHub Token: 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

## Development Commands
- Frontend: `npm start` (port 3000)
- Backend: `npm run dev` (port 3001)
- Build frontend: `npm run build`
- Run tests: `npm test`
- Database: PostgreSQL (check if service is running with `brew services list`)

## Deployment
- Platform: Digital Ocean App Platform
- Deployment triggers automatically on push to main branch
- **IMPORTANT: Always commit and push changes to deploy them**

## Claude Code Workflow Rules
1. **Always commit and push after completing tasks** - Digital Ocean auto-deploys from GitHub
2. **Use descriptive commit messages** with the standard footer
3. **Check build status** after pushing (builds take ~30 seconds)
4. **Test locally first** with `npm run build` to catch TypeScript errors

## Common Issues
- If git push fails, use: `git remote set-url origin https://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@github.com/huckfinne-a/toeqbank.git`
- If PostgreSQL connection fails, start with: `brew services start postgresql`