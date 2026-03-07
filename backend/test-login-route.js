/**
 * Router simple para test login directo
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/test', (req, res) => {
    try {
        // Leer el archivo HTML directamente
        const htmlPath = path.join(__dirname, 'test-login.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        res.send(htmlContent);
    } catch (error) {
        res.status(500).send('Error loading test page: ' + error.message);
    }
});

module.exports = router;
