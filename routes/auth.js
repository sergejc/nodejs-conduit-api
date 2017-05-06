const jwt = require('express-jwt');
const secret = require('../config').secret;

function isAuthorization(headers) {
    return 'authorization' in headers;
}

function hasToken(headers) {
    return headers.authorization.indexOf('Token') === 0;
}

/***
 * Extracts the JWT from Authorization header
 */
function getTokenFromHeader(req) {
    const headers = req.headers;

    if(!isAuthorization(headers) || !hasToken(headers)) {
        return null;
    }

    console.log(headers);
    return headers.authorization.split(' ')[1];
}

const auth = {
    required: jwt({
        secret: secret,
        userProperty: 'payload',
        getToken: getTokenFromHeader
    }),
    optional: jwt({
        secret: secret,
        userProperty: 'payload',
        credentialsRequired: false,
        getToken: getTokenFromHeader
    })
};

module.exports = auth;
