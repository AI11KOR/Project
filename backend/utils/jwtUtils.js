const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const connectDB = require('../config/database');
const { ObjectId } = require('mongodb');

// ✅ 이 파일은 JWT 인증과 관련된 모든 핵심 로직을 담고 있으며,
// accessToken, refreshToken 생성/검증, refreshToken의 DB 저장 및 조회 역할을 한다.
// 고정값: process.env.JWT_SECRET, JWT_REFRESH_SECRET, DB 컬렉션명 등

//이건 프론트에 직접 JWT를 보내고 localStorage에 저장했지.

//그래서 JWT 안에 유저 정보(이메일, 닉네임 등)를 담아서 프론트에서 디코딩해서 써먹었어.

//즉, 프론트가 직접 JWT를 꺼내서 사용했기 때문에 정보가 담겨 있어야 했던 거야.

// 로그인 생성시 사용
// accessToken은 유저 인증에 사용되며, 클라이언트 요청 시 검증을 위해 쓰인다.
// accessToken은 프론트에서 직접 쓰이지 않고, 주로 서버가 검증하는 데 사용됨.
// 유저 정보를 담아 accessToken 생성 (15분 유효)
const createAccessToken = (user) => { // authJWT.js에서 refreshToken 검증 후 새로운 accessToken 생성 시 사용됨
    const payload = { // 이 함수에는 _id, email, nickname을 담아서 authJWT의 accessToken 생성 및 쿠키에 저장하게 됨
        _id: user._id,
        email: user.email,
        nickname: user.nickname,
      };
      return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}; 

// 토큰을 생성할 때 refreshToken 을 db에 저장하는 로직을 추가하여 db 저장 포함한다
// 로그인 시 사용
// refreshToken은 accessToken이 만료되었을 때 새로운 accessToken을 발급받는 데 사용됨
// accessToken보다 훨씬 긴 유효기간을 가짐 (7일)
// 이 함수는 controller에서 login할 떄 쓰는 함수로 거기서 import 해서 사용
const createRefreshToken = async (user) => { // 유저 id만 담아 refreshToken 생성 (7일 유효)
    const payload = { _id: user._id };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

// access token 검증
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET); // 실패 시 예외 발생
};

// refresh token 검증, 쿠키에서 꺼낸 refreshToken이 실제로 유효한지 검사
const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET)  // 실패 시 예외 발생
};

// refreshToken DB에 저장(userId 기준으로 덮어쓰기)
// refreshToken을 MongoDB에 저장 (userId 기준으로 upsert)
const saveRefreshTokenToDB = async (userId, token) => {
    const db = await connectDB();
    await db.collection('refreshTokens').updateOne(
        { userId: new ObjectId(userId) }, // ➜ 찾을 조건
        { $set: { token, updateAt: new Date() } }, // ➜ 수정 내용
        { upsert: true } // 찾은 데이터가 없으면 새 데이터를 만들어서 업데이트까지 동시에 진행
    );
};

// refreshToken DB에서 조회
// 토큰 재발급 시, 클라이언트 쿠키의 refreshToken과 DB에 저장된 토큰을 비교
const getRefreshTokenFromDB = async (userId) => {
    const db = await connectDB();
    return await db.collection('refreshTokens').findOne({ userId: new ObjectId(userId) })
};

// ✅ generateToken 객체로 묶어서 export
const generateToken = {
    createAccessToken,
    createRefreshToken,
    saveRefreshTokenToDB,
    getRefreshTokenFromDB
};

module.exports = {
    generateToken,
    verifyAccessToken,
    verifyRefreshToken
};