const express = require('express');
const connectionsRoutes = require('./connections');
const emailsRoutes = require('./emails');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Turnship API v1' });
});

// Mount connections routes
router.use('/connections', connectionsRoutes);

// Mount email routes
router.use('/emails', emailsRoutes);

module.exports = router;
