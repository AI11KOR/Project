const express = require('express');
const passport = require('passport')
const router = express.Router();
require('../passport/googleStrategy');
require('../passport/kakaoStrategy');
require('../passport/naverStrategy')
const jwt = require('jsonwebtoken');
const { generateToken } = require('../utils/jwtUtils');
const { handleGoogleCallback, handleKakaoCallback, handleNaverCallback } = require('../controller/socialController');
const authJWT = require('../middleware/authJWT');



// 구글 로그인 시작
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// google callback
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), handleGoogleCallback);

// kakao 로그인 시작
router.get('/kakao', passport.authenticate('kakao', { scope: ['profile_nickname', 'account_email'] }));

// kakao callback
router.get('/kakao/callback', passport.authenticate('kakao', { session: false, failureRedirect: '/login' }), handleKakaoCallback);

// naver 로그인 시작 구글처럼 기본 authenticate만 호출
// 네이버는 개발자 콘솔(로그인 동의항목)에서 체크한 항목이 실제 제공 범위를 결정
router.get('/naver', passport.authenticate('naver'))

// // naver callback
router.get('/naver/callback', passport.authenticate('naver', { session: false, failureRedirect: '/login' }), handleNaverCallback)





module.exports = router;