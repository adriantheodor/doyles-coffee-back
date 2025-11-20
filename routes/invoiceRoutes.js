const express = require('express');
const router = express.Router();

// Example route
router.get('/', (req, res) => {
  res.send('Invoice route works!');
});

module.exports = router;
