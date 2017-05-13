const router = require('express').Router();
const passport = require('passport');
const mongoose = require('mongoose');
const Article = mongoose.model('Article');
const User = mongoose.model('User');
const Comment = mongoose.model('Comment');
const auth = require('../auth');

/**
 * Prepopulate article data from the slug
 */
router.param('article', (req, res, next, slug) => {
    Article.findOne({slug: slug})
    .populate('author')
    .then(article => {
        if(!article) return res.sendStatus(404);

        req.article = article;
        return next();
    }).catch(next);
});

/**
 * Endpoint for creating articles
 */
router.post('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id).then(function(user) {
        if(!user) return res.sendStatus(401);

        const article = new Article(req.body.article);
        article.author = user;

        return article.save().then(function() {
            return res.json({article: article.toJSONFor(user)});
        });
    }).catch(next);
});

/**
 * Endpoint for retrieving an article by its slug
 */
router.get('/:article', auth.optional, (req, res, next) => {
    Promise.all([
        req.payload ? User.findById(req.payload.id) : null,
        req.article.populate('author').execPopulate()
    ]).then(result => {
        const user = result[0];

        return res.json({article: req.article.toJSONFor(user)});
    }).catch(next);
});

/**
 * Endpoint for updating articles
 */
router.put('/:article', auth.required, (req, res, next) => {
    User.findById(req.payload.id).then(user => {
        if(req.article.author._id.toString() !== req.payload.id.toString()) {
            return res.sendStatus(403);
        }
        const article = req.body.article;

        ['title', 'descrption', 'body'].forEach(prop => {
            if(prop in article) {
                req.article[prop] = article[prop];
            }
        });

        req.article.save().then(article => {
            return res.json({article: article.toJSONFor(user)});
        }).catch(next);
    });
});

/**
 * Endpoint for deleting articles
 */
router.delete('/:article', auth.required, (req, res, next) => {
    User.findById(req.payload.id).then(() => {
        if(req.article.author._id.toString() !== req.payload.id.toString()) {
            return res.sendStatus(403);
        }

        return req.article.remove().then(() => {
            return res.sendStatus(204);
        }).catch(next);
    });
});

/**
 * Endpoint for favoriting an article
 */
router.post('/:article/favorite', auth.required, (req, res, next) => {
    const articleId = req.article._id;

    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        return user.favorite(articleId).then(() => {
            return req.article.updateFavoriteCount().then(article => {
                return res.json({article: article.toJSONFor(user)});
            });
        });
    }).catch(next)
});

/**
 * Endpoint for unfavoriting an article
 */
router.delete('/:article/favorite', auth.required, (req, res, next) => {
    const articleId = req.article._id;

    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        return user.unfavorite(articleId).then(() => {
            return req.article.updateFavoriteCount().then(article => {
                return res.json({article: article.toJSONFor(user)});
            });
        });
    }).catch(next);
});

/**
 * Endpoint to create comments on articles
 */
router.post('/:article/comments', auth.required, (req, res, next) => {
    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        const comment = new Comment(req.body.comment);
        comment.article = req.article;
        comment.author = user;

        return comment.save().then(() => {
            req.article.comments.push(comment);

            return req.article.save().then(article => {
                res.json({comment: comment.toJSONFor(user)});
            });
        });
    }).catch(next);
});

/**
 * endpoint to list comments on articles
 */
router.get('/:article/comments', auth.optional, (req, res, next) => {
    Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(user => {
        return req.article.populate({
            path: 'comments',
            populate: {
                path: 'author'
            },
            options: {
                sort: {
                    createdAt: 'desc'
                }
            }
        }).execPopulate().then(article => {
            return res.json({
                comments: req.article.comments.map(comment => {
                    return comment.toJSONFor(user);
                })
            });
        });
    }).catch(next);
});

/**
 * Middleware for resolving the :comment
 */
router.param('comment', (req, res, next, id) => {
    Comment.findById(id).then(comment => {
        if(!comment) return res.sendStatus(404);

        req.comment = comment;

        return next();
    }).catch(next);
});


/**
 * Endpoint to destroy comments on articles
 */
router.delete('/:article/comments/:comment', auth.required, (req, res, next) => {
    if(req.comment.author.toString() !== req.payload.id.toString()) {
        return res.sendStatus(403);
    }

    req.article.comments.remove(req.comment._id);
    req.article.save()
        .then(Comment.find({_id: req.comment._id}).remove().exec())
        .then(() => res.sendStatus(204));
});

/**
 * End point to list all articles
 */
router.get('/', auth.optional, (req, res, next) => {
    const query = {};
    const limit = 20;
    const offset = 0;

    if('limit' in req.query) {
        limit = Number(req.query.limit);
    }

    if('offset' in req.query) {
        offset = Number(req.query.offset);
    }

    if('tag' in req.query) {
        query.tagList = {"$in" : [req.query.tag]};
    }

    Promise.all([
        req.query.author ? User.findOne({username: req.query.author}) : null,
        req.query.favorite ? User.findOne({username: req.query.favorite}) : null
    ]).then(results => {
        const author = results[0];
        const favorite = results[1];

        if(author) {
            query.author = author._id;
        }

        if(favorite) {
            query._id = {$in: favorite.unfavorites};
        }
        else if(req.query.favorited) {
            query._id = {$in: []}
        }

        return Promise.all([
            Article.find(query)
            .limit(limit)
            .skip(offset)
            .sort({createdAt: 'desc'})
            .populate('author')
            .exec(),
            Article.count(query).exec(),
            req.payload ? User.findById(req.payload.id) : null
        ]).then(result => {
            const articles = result[0];
            const articlesCount = result[1];
            const user = result[2];

            return res.json({
                articles: articles.map(article => {
                    return article.toJSONFor(user);
                }),
                articlesCount: articlesCount
            });
        });
    }).catch(next);
});

/**
 * Retrieving articles authored by users being followed
 */
router.get('/feed', auth.required, (req, res, next) => {
    const limit = 20;
    const offset = 0;

    if('limit' in req.query) {
        limit = Numbe(req.query.limit);
    }

    if('offset' in req.query) {
        offset = Numbe(req.query.offset)
    }

    User.findById(req.payload.id).then(user => {
        if(!user) return res.sendStatus(401);

        Promise.all([
            Article.find({author: {$in: user.following}})
                .limit(limit)
                .skip(offset)
                .populate('author')
                .exec(),
            Article.count({author: {$in: user.following}})
        ]).then(results => {
            const articles = results[0];
            const articlesCount = results[1];


            return res.json({
                articles: articles.map(article => {
                    return article.toJSONFor(user)
                }),
                articlesCount: articlesCount
            });
        }).catch(next);
    });
});

module.exports = router;
