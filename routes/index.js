const express = require('express');
const router = express.Router();

// Basic route
router.get('/', (req, res) => {
    res.json({
        message: 'Hanabi Backend API v1.0',
        status: 'OK'
    });
});

module.exports = router;
