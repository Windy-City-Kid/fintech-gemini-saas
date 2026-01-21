const express = require('express');
const router = express.Router();
const { sha256 } = require('../utils/hash');

router.post('/ai-prompt', (req, res) => {
  const { user_id, prompt, response, timestamp } = req.body;

  const log = {
    user_id,
    prompt,
    response,
    timestamp: timestamp || new Date().toISOString(),
    hash: sha256(prompt + response)
  };

  console.log('[LOGGED AI INTERACTION]:', log);
  res.status(200).json({ status: 'logged', hash: log.hash });
});

module.exports = router;
