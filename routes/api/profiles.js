const router = require('express').Router();
const mongoose = require('mongoose');
const User = mongoose.model('User');
const auth = require('../auth');

/**
 * Prepopulate req.profile with the user's data
 * when the :username parameter is contained
 * within a route
 */
router.param('username', (req, res, next, username) => {
    User.findOne({username: username}).then(user => {
        if(!user) return res.sendStatus(404);

        req.profile = user;
        return next();
    }).catch(next);
});

/**
 * Create an endpoint to fetch a user's profile by their username
 */
router.get('/:username', auth.optional, (req, res, next) => {
    if(!req.payload) {
        return res.json({profile: req.profile.toProfileJSONFor(false)});
    }

    User.findById(req.payload.id).then(user => {
        const profile = req.profile;

        if(!user) {
            return res.json({profile: profile.toProfileJSONFor(false)});
        }

        return res.json({profile: profile.toProfileJSONFor(user)});
    });

    return res.json({profile: req.profile.toProfileJSONFor()});
});

module.exports = router;
