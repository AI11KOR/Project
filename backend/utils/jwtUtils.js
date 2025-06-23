const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');

exports.generateToken = ( userId, userEmail, userNickname ) => {
    return jwt.sign({ _id: userId, email: userEmail, nickname: userNickname }, process.env.JWT_SECRET, {
        expiresIn: '15m'
    })
}

