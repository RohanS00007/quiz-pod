const express = require('express');
const router = express.Router();
const { getFavourites, addFavourite, removeFavourite } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/favourites', protect, getFavourites);
router.post('/favourites', protect, addFavourite);
router.delete('/favourites/:id', protect, removeFavourite);

module.exports = router;
