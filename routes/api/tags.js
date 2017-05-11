const router = require('express').Router();
const mongoose = require('mongoose');
const Article = mongoose.model('Article');

/**
 * Getting the set of tags that have been userd on article
 */
router.get('/', (req, res, next) => {
    Article.find().distinct('tagList').then(tags => {
        return res.json({tags: tags});
    }).catch(next);
});

module.exports = router;
