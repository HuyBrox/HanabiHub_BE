# ✅ FINAL CHECKLIST - BullMQ Migration

## 📋 Hoàn thành

### Code Changes ✅
- [x] Cài đặt `bullmq` và `ioredis`
- [x] Thêm `REDIS_URL` vào `.env`
- [x] Refactor `src/middleware/learning-tracker.ts`:
  - [x] Xóa Map + setTimeout
  - [x] Thêm BullMQ Queue
  - [x] Thêm Worker với retry logic
  - [x] Giữ nguyên API exports
- [x] Update `src/index.ts`:
  - [x] Import cleanup function
  - [x] Add graceful shutdown
- [x] Không có TypeScript errors
- [x] Không có code thừa

### Documentation ✅
- [x] BULLMQ_MIGRATION.md - Guide chi tiết
- [x] MIGRATION_SUMMARY.md - Tóm tắt thay đổi
- [x] COMPARISON_MAP_VS_BULLMQ.md - So sánh trước/sau

---

## 🧪 Cần test

### Local Testing
- [ ] Start server: `npm run dev`
- [ ] Gọi API track activity
- [ ] Check logs xuất hiện:
  - [ ] `📝 Queued learning update for user ...`
  - [ ] `🔄 Processing learning insights for user ...`
  - [ ] `✅ Learning insights updated for user ...`
- [ ] Test graceful shutdown (Ctrl+C)
- [ ] Check logs xuất hiện:
  - [ ] `SIGINT received. Shutting down gracefully...`
  - [ ] `🔌 Learning tracker cleanup completed`
  - [ ] `✅ Server closed`

### Redis Testing
- [ ] Connect to Redis: `redis-cli -u $REDIS_URL`
- [ ] Check keys exist: `KEYS bull:learning-insights:*`
- [ ] Monitor jobs: `redis-cli MONITOR`
- [ ] Check memory usage: `INFO memory`

### Load Testing (Optional)
- [ ] Simulate 100 concurrent users
- [ ] Check queue metrics: `GET /admin/queue-status`
- [ ] Verify all jobs processed
- [ ] Check for failed jobs

---

## 🚀 Deployment

### Pre-deployment
- [ ] Redis server ready (cloud hoặc self-hosted)
- [ ] Environment variables set:
  - [ ] `REDIS_URL=redis://...`
- [ ] Update PM2/Docker config với graceful shutdown

### Deployment Steps
```bash
# 1. Build
npm run build

# 2. Set environment
export REDIS_URL=redis://...

# 3. Start with PM2
pm2 start dist/index.js --name hanabi-api

# 4. Monitor
pm2 logs hanabi-api
pm2 monit

# 5. Test graceful shutdown
pm2 reload hanabi-api  # Should see cleanup logs
```

### Post-deployment
- [ ] Check server logs
- [ ] Monitor Redis memory
- [ ] Check queue metrics API
- [ ] Test with real traffic
- [ ] Setup alerts for failed jobs

---

## 📊 Monitoring Setup (Recommended)

### Redis Monitoring
```bash
# Memory usage
redis-cli INFO memory | grep used_memory_human

# Queue size
redis-cli LLEN bull:learning-insights:wait

# Failed jobs
redis-cli LLEN bull:learning-insights:failed
```

### Application Metrics API
```typescript
// Add endpoint trong routes
router.get('/admin/queue-status', isAuth, async (req, res) => {
  const status = await getQueueStatus();
  res.json(status);
});
```

### Alerts (Optional)
- [ ] Alert nếu failed jobs > 10
- [ ] Alert nếu waiting jobs > 100
- [ ] Alert nếu Redis memory > 80%

---

## 🔧 Troubleshooting

### Issue: Jobs không chạy
```bash
# Check worker running
ps aux | grep node

# Check Redis connection
redis-cli -u $REDIS_URL PING

# Check logs
tail -f logs/app.log
```

### Issue: Jobs bị stuck
```bash
# Clear all jobs (careful!)
redis-cli DEL bull:learning-insights:wait
redis-cli DEL bull:learning-insights:active

# Restart worker
pm2 restart hanabi-api
```

### Issue: Too many failed jobs
```typescript
// Check failed jobs
const failed = await learningInsightsQueue.getFailed();
console.log(failed);

// Retry all failed
for (const job of failed) {
  await job.retry();
}
```

---

## 📚 References

- [BullMQ Docs](https://docs.bullmq.io/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Node.js Graceful Shutdown](https://nodejs.org/api/process.html#signal-events)

---

## ✅ Sign-off

- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Ready for deployment

**Migration complete! 🎉**
