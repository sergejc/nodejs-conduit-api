const mongoose = require('mongoose');
const uniqValidator = require('mongoose-unique-validator');
const slug = require('slug');

/**
 * ArticleSchema
 */
const ArticleSchema = new mongoose.Schema({
    slug: {type: String, lowercase: true, unique: true},
    title: String,
    description: String,
    body: String,
    favoritesCount: {type: Number, default: 0},
    tagList: [{type: String}],
    author: {type: mongoose.Schema.Types.ObjectId, refs: 'User'}
}, {timestamp: true});

/**
 * Creates an unique slug
 */
function createSlug(title) {
    return slug(title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
}

/**
 * Create a model method for generating unique article slugs
 */
ArticleSchema.methods.slugify = function() {
    this.slug = createSlug(title);
}

/**
 *  Invokes before validation
 */
ArticleSchema.pre('validate', function(next) {
    this.slugify();
    next();
});

/**
 * Represent an article in JSON
 */
ArticleSchema.methods.toJSOnFor = function(user) {
    return {
        slug: this.slug,
        title: this.title,
        description: this.discription,
        body: this.body,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tagList: this.tagList,
        favoritesCount: this.favoritesCount,
        author: this.author.toProfileJSONFor(user)
    };
}

ArticleSchema.plugin(uniqValidator, {message: 'is already taken'});
