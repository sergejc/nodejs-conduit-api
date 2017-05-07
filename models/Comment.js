const mongoose = require('mongoose');

/**
 * Comment model
 */
const CommentSchema = new mongoose.Schema({
    body: String,
    author: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    article: {type: mongoose.Schema.Types.ObjectId, ref: 'Article'},
}, {timestamp: true});


CommentSchema.methods.toJSONFor = function(user) {
    return {
        id: this._id,
        body: this.body,
        createdAt: this.createAt,
        author: this.author.toProfileJSONFor(user)
    };
}


mongoose.model('Comment', CommentSchema);
