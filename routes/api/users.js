const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const User = mongoose.model('User');
const auth = require('../auth');

/**
 * Create the registration route
 */
router.post('/users', (req, res, next) => {
    const user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);

    user.save().then(() => {
        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

/**
 * Create the login route
 */
router.post('/users/login', (req, res, next) => {
    const payload = req.body.user;

    if(!payload.email) {
        return res.status(422).json({
            errors: {email: "can't be blank"}
        });
    }

    if(!payload.password) {
        return res.status(422).json({
            errors: {password: "can't be blank"}
        });
    }

    passport.authenticate('local', {session: false}, (err, user, info) => {
        if(err) return next(err);

        if(!user) {
            return res.status(422).json(info);
        }

        user.token = user.generateJWT();
        return res.json({user: user.toAuthJSON()});
    })(req, res, next);
});

/**
 * Create an endpoint to get the current user's auth
 * payload from their token
 */
router.get('/user', auth.required, (req, res, next) => {
    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        return res.json({user: user.toAuthJSON()});
    }).catch(next);
});

/**
 * Create the update users endpoint
 */
router.put('/user', auth.required, (req, res, next) => {
    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        const reqUser = req.body.user;
        ['username', 'email', 'bio', 'image'].forEach((prop) => {
            if(prop in reqUser) {
                user[prop] = reqUser[prop];
            }
        });

        if('password' in reqUser) {
            user.setPasswords(reqUser.password);
        }

        return user.save().then(() => {
            return res.json({user: user.toAuthJSON()});
        });
    }).catch(next);
});

module.exports = router;
