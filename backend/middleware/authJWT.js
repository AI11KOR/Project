const jwt = require('jsonwebtoken');
require('dotenv').config();
const { verifyAccessToken, createAccessToken, getRefreshTokenFromDB, verifyRefreshToken } = require('../utils/jwtUtils');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/database')
// authJWT는 accessToken 검증과 재발급만 담당
// 따라서 refreshToken 생성은 책임 범위 밖 => jwtUtils가 담당

// ✅ 이 파일은 JWT 인증 미들웨어로, 프론트에서 들어온 요청에 대해 accessToken 유효성 검사 및
// 만료된 경우 refreshToken으로 재발급 시도를 수행함
const authJWT = async (req, res, next) => {
    console.log('✅ [authJWT] 실행됨');

    const token = req.cookies.accessToken; // 🔥 쿠키에서 가져오는지 꼭 확인
    console.log('👉 받은 accessToken:', token); // ✅ 실제 쿠키 들어왔는지 확인

     // ✅ 1. accessToken 없는 경우 → 로그인 안 된 상태
    if(!token) {
        // ✅ 1. accessToken이 없을 경우
        return res.status(401).json({ message: 'accessToken 없음' })
    }

    try {
        // ✅ 2. accessToken이 유효할 경우 → req.user에 정보 넣고 통과
        const decoded = verifyAccessToken(token); // → wrapper로 함수만 호출 jwt.verify(token, process.env.JWT_SECRET)
        console.log('✅ accessToken 디코딩 성공:', decoded);

        req.user = decoded; // 이후 라우터에서 req.user 로 유저 정보 접근 가능
        console.log('Decoded accessToken:', decoded)
        console.log('🧪 accessToken 디코딩된 _id 타입:', typeof decoded._id);  // string일 확률 높음
        return next();
    } catch (error) {
        // ✅ 3. accessToken 만료된 경우 → refreshToken 검증 시도
        if(error.name === 'TokenExpiredError') {
            try {
                const refreshToken = req.cookies.refreshToken; // 쿠키에서 refreshToken 가져오기
                if(!refreshToken) {
                    return res.status(401).json({ message: 'Refresh Token 없음' });
                }

                // 이 검사를 통과하면 다음 단계에서 DB와 비교
                const decodedRefresh = verifyRefreshToken(refreshToken); // ✅ 함수 분리하여 명확하게
                const stored = await getRefreshTokenFromDB(decodedRefresh._id);
                console.log('🧪 accessToken 디코딩된 _id 타입:', typeof decoded._id);  // string일 확률 높음
                console.log('🧪 refreshToken 디코딩된 _id 타입:', typeof decodedRefresh._id);

                // refreshToken 디코딩해서 _id 추출한 뒤, 해당 유저의 DB에 저장된 refreshToken과 비교
                console.log('Decoded refreshToken:', decodedRefresh)
                console.log('authJWT 미들웨어 통과:', req.originalUrl);
                // : 해커가 쿠키를 훔쳐서 refreshToken만 바꿔치기하면, DB 검증 없이는 그대로 통과될 수 있음.
                // 그래서 반드시 stored.token === refreshToken 비교
                // // ✅ 반드시 DB 값과 쿠키 값을 비교 (보안 핵심)
                if (!stored || stored.token !== refreshToken) {
                    return res.status(403).json({ message: 'Refresh Token 유효하지 않음' });
                }

                // ✅ 5. 유저 정보 가져와서 새로운 accessToken 발급
                const db = await connectDB();
                const user = await db.collection('user').findOne({ _id: new ObjectId(decodedRefresh._id) });

                if(!user) {
                    return res.status(404).json({ message: '유저 없음' });
                }

                const newAccessToken = createAccessToken(user);
                // 받아온 createAccessToken(유저 정보 _id: email, nickname 15분 유효) 쿠키에 저장
                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true, // 자바스크립트에서 접근 못하게 함
                    secure: false, // 배포 시 true (https 환경에서만 쿠키 전송)
                    sameSite: 'Lax', // 🔥 쿠키 전송에 안정성 제공 (크롬 정책 대응)
                    maxAge: 1000 * 60 * 15, // 고정값: 15분
                });

                req.user = {
                    _id: user._id,
                    email: user.email,
                    nickname: user.nickname,
                };
                console.log('req.user.nickname:', req.user.nickname) 
                console.log('👉 쿠키 전체:', req.cookies);
                console.log('👉 받은 accessToken:', req.cookies.accessToken);
                
                return next();
            } catch (refreshErr) {
                console.error('RefreshToken 오류:', refreshErr);
                return res.status(403).json({ message: 'Refresh Token 유효하지 않음' });
            }
        }

        console.error('Access Token 오류:', error);
        // ✅ 그 외 accessToken 에러는 일반 인증 실패 처리
        return res.status(401).json({ message: '유효하지 않은 Access Token' });
    }
};

module.exports = authJWT;
