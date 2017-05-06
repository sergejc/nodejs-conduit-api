var router = require('express').Router();

function combineErrors(err) {
    return Object.keys(err.errors).reduce((errors, key) => {
        errors[key] = err.errors[key].message;
        return errors;
    }, {});
}

/**
 * Middleware for handling validation errors
 */
router.use((err, req, res, next) => {
    if(err.name !== 'ValidationError') {
        return next(err);
    }

    return res.status(422).json({
        errors: combineErrors(err)
    });
});

router.use('/', require('./users'));
router.use('/profiles', require('./profiles'));

module.exports = router;
