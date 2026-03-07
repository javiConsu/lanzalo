/**
 * Router simple para test login directo
 */
const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
    res.sendFile('/home/javi/.openclaw/workspace/lanzalo/backend/test-login.html', { root: __dirname });
});

module.exports = router;
