const User = require('../models/User');

// @desc    Get all favourite questions for a user
// @route   GET /api/user/favourites
// @access  Private
exports.getFavourites = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('favouriteQuestions');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user.favouriteQuestions);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add a question to favourites
// @route   POST /api/user/favourites
// @access  Private
exports.addFavourite = async (req, res) => {
    try {
        const { subject, text, options, correct } = req.body;
        if (!text || !options || correct === undefined) {
            return res.status(400).json({ message: 'Please provide text, options, and correct index.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.favouriteQuestions.push({ subject, text, options, correct });
        await user.save();

        res.status(201).json(user.favouriteQuestions[user.favouriteQuestions.length - 1]);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Remove a question from favourites
// @route   DELETE /api/user/favourites/:id
// @access  Private
exports.removeFavourite = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.favouriteQuestions = user.favouriteQuestions.filter(
            q => q._id.toString() !== req.params.id
        );
        await user.save();

        res.json({ message: 'Question removed from favourites.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
