# Claude Code Configuration

## Git Configuration
- Repository: https://github.com/huckfinne-a/toeqbank.git
- GitHub Token: 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

## Database Configuration

🚨 **CRITICAL: NEVER SWITCH TO LOCAL DATABASE** 🚨
- **ALWAYS use the Digital Ocean production database for ALL development**
- **DO NOT create or use a local PostgreSQL database**
- **The .env file should ALWAYS point to the DO database**

- Digital Ocean Database Connection:
  ```
  DATABASE_URL=postgresql://toeqbank:AVNS_wbfh3IuQ6BE0OKhBMs0@app-7cb09303-7e3f-4f9f-b588-64d1d97b1bd4-do-user-19953993-0.i.db.ondigitalocean.com:25060/toeqbank?sslmode=require
  ```
- Host: app-7cb09303-7e3f-4f9f-b588-64d1d97b1bd4-do-user-19953993-0.i.db.ondigitalocean.com
- Port: 25060
- Username: toeqbank
- Password: AVNS_wbfh3IuQ6BE0OKhBMs0
- Database: toeqbank
- SSL Mode: require
- **CA Certificate**: `toeqbank-backend/ca-certificate.crt` (downloaded from DO dashboard)
  - ✅ Certificate available for future use
  - ✅ Safe to commit to git (public certificate)  
  - ✅ Currently using relaxed SSL verification (rejectUnauthorized: false) for DO managed database
  - Note: Removed `?sslmode=require` from DATABASE_URL to avoid conflicts

## Development Commands
- Frontend: `npm run dev` (port 3000) - **IMPORTANT: Use `npm run dev` NOT `npm start` for development**
- Backend: `npm run dev` (port 3001)
- Build frontend: `npm run build`
- Run tests: `npm test`
- Database: PostgreSQL (check if service is running with `brew services list`)

## Deployment
- Platform: Digital Ocean App Platform
- Deployment triggers automatically on push to main branch
- **IMPORTANT: Always commit and push changes to deploy them**

## Claude Code Workflow Rules
🚨 **CRITICAL: ALWAYS COMMIT AND PUSH AFTER EVERY CHANGE** 🚨

1. **MANDATORY: Push after completing ANY task** - Digital Ocean auto-deploys from GitHub
2. **MANDATORY: Push after ANY file modification** - Even small fixes need deployment
3. **Use descriptive commit messages** with the standard footer
4. **Check build status** after pushing (builds take ~30 seconds) 
5. **Test locally first** with `npm run build` to catch TypeScript errors

### Commit Checklist:
- [ ] Made changes to code/files?
- [ ] Built successfully with `npm run build`?  
- [ ] Added, committed, and pushed changes?
- [ ] Verified deployment started on Digital Ocean?

## Database Backup & Recovery
⚠️ **CRITICAL: Always backup before major changes!**

### Manual Backup (run before development):
```bash
cd toeqbank-backend
node backup_database.js
```

### Restore from Backup:
```bash
cd toeqbank-backend
node restore_database.js  # Shows available backups
node restore_database.js 2025-09-01T18-30-23-780Z  # Restore specific backup
```

### Backup Schedule Recommendation:
- Before major development sessions
- After uploading significant data
- Weekly automated backups (set up cron job)

## Common Issues
- If git push fails, use: `git remote set-url origin https://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@github.com/huckfinne-a/toeqbank.git`
- If PostgreSQL connection fails, start with: `brew services start postgresql`
- **DATA LOSS PREVENTION**: Always run `node backup_database.js` before development work