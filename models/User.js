const mongoose = require('mongoose');
const uniqValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const secret = require('../config').secret;
const jwt = require('jsonwebtoken');

/**
 * UserSchema
 */
const UserSchema = new mongoose.Schema({
    username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], index: true},
    email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true},
    bio: String,
    image: String,
    hash: String,
    salt: String
}, {timestamp: true});

UserSchema.plugin(uniqValidator, {message: 'is already taken'});

/**
 * Generating a hash from given password and salt
 */
function generateHash(password, salt) {
    debugger;
    return crypto.pbkdf2Sync(password, salt, 1000, 512, 'sha512').toString('hex');
}

/**
 * Generating a random salt
 */
function generateSalt() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Sets user password
 */
UserSchema.methods.setPassword = function(password) {
    this.salt = generateSalt();
    this.hash = generateHash(password, this.salt);
};

/**
 * Validate user password
 */
UserSchema.methods.validPassword = function(password) {
    return this.hash === generateHash(password, this.salt)
};

/**
 * Generating JWT user token
 */
UserSchema.methods.generateJWT = function() {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000)
    }, secret);
};

/**
 * JSON representation of a user for authentication
 */
UserSchema.methods.toAuthJSON = function() {
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT()
    }
};

/**
 * User public profile data
 */
UserSchema.methods.toProfileJSONFor = function(user) {
    return {
        username: this.username,
        bio: this.bio,
        image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
        following: false
    }
}

mongoose.model('User', UserSchema);
