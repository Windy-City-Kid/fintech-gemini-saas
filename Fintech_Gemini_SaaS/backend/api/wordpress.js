const express = require('express');
const router = express.Router();

router.post('/insert-post', (req, res) => {
  const { title, type, status } = req.body;
  console.log(`[WordPress] Creating post: ${title} (${type})`);

  // Simulated post creation
  res.status(200).json({ status: 'posted', post: { title, type, status } });
});

module.exports = router;
