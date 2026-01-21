const express = require('express');
const router = express.Router();

router.post('/sync-event', (req, res) => {
  const { event, user_id, timestamp } = req.body;
  console.log(`[Lovable] Sync Event:`, req.body);

  // Simulated business logic here...
  res.status(200).json({ status: 'ok', received: req.body });
});

module.exports = router;
