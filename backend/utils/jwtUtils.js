const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const connectDB = require('../config/database');
const { ObjectId } = require('mongodb');

//이건 프론트에 직접 JWT를 보내고 localStorage에 저장했지.

//그래서 JWT 안에 유저 정보(이메일, 닉네임 등)를 담아서 프론트에서 디코딩해서 써먹었어.

//즉, 프론트가 직접 JWT를 꺼내서 사용했기 때문에 정보가 담겨 있어야 했던 거야.

// 따라서 아래 항목은 필요가 없어짐짐
// exports.generateToken = ( userId, userEmail, userNickname ) => {
//     return jwt.sign({ _id: userId, email: userEmail, nickname: userNickname }, process.env.JWT_SECRET, {
//         expiresIn: '15m'
//     })
// }

// 로그인 생성시 사용
const createAccessToken = (user) => {
    const payload = {
        _id: user._id,
        email: user.email,
        nickname: user.nickname,
      };
      return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// 토큰을 생성할 때 refreshToken 을 db에 저장하는 로직을 추가하여 db 저장 포함한다
// 로그인 시 사용
const createRefreshToken = async (user) => {
    const payload = { _id: user._id };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// access token 검증
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};

// refresh token 검증
const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
};

// refreshToken DB에 저장(userId 기준으로 덮어쓰기)
const saveRefreshTokenToDB = async (userId, token) => {
    const db = await connectDB();
    await db.collection('refreshTokens').updateOne(
        { userId: new ObjectId(userId) },
        { $set: { token } },
        { upsert: true }
    );
};

// refreshToken DB에서 조회
const getRefreshTokenFromDB = async (userId) => {
    const db = await connectDB();
    return await db.collection('refreshTokens').findOne({ userId: new ObjectId(userId) })
};

module.exports = { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken,
    saveRefreshTokenToDB, getRefreshTokenFromDB
}