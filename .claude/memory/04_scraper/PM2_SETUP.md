# PM2 Setup — Scraper Trigger Server

## Current process
- **Name**: `scraper-trigger`
- **Port**: 3001
- **Secret**: `uaeit_trigger_2026`
- **Command**: `npx ts-node src/trigger-server.ts`
- **Working dir**: `/opt/apps/uaeitjobs-web-app/scraper/`

## Start command
```bash
cd /opt/apps/uaeitjobs-web-app/scraper
TRIGGER_SECRET=uaeit_trigger_2026 TRIGGER_PORT=3001 \
  pm2 start 'npx ts-node src/trigger-server.ts' --name scraper-trigger
pm2 save
```

## Useful pm2 commands
```bash
pm2 status                    # list all processes
pm2 logs scraper-trigger      # tail logs
pm2 restart scraper-trigger   # restart after code changes
pm2 stop scraper-trigger      # stop
pm2 delete scraper-trigger    # remove from pm2
pm2 save                      # persist process list to disk
pm2 startup                   # generate startup script (run once after setup)
```

## ⚠ Missing: pm2 startup not configured
If VPS restarts, `scraper-trigger` will NOT auto-start. Run `pm2 startup` once and follow the instructions to fix this.

## After pulling new scraper code
```bash
cd /opt/apps/uaeitjobs-web-app
git pull origin main --ff-only
cd scraper && npm install
pm2 restart scraper-trigger
```

## Verify trigger server is responding
```bash
curl -s -X GET http://localhost:3001/status \
  -H 'X-Trigger-Secret: uaeit_trigger_2026'
# Expected: {"status":{"bayt":"idle","naukrigulf":"idle","gulftalent":"idle","linkedin":"idle"}}
```
