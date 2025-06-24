const jwt = require('jsonwebtoken');
require('dotenv').config();
const { verifyAccessToken, createAccessToken, getRefreshTokenFromDB } = require('../utils/jwtUtils')
const { ObjectId } = require('mongodb')

module.exports = async (req, res, next) => {
    const token = req.cookies.accessToken;
     // ✅ 1. accessToken 없는 경우 → 로그인 안 된 상태
    if(!token) return res.status(401).json({ message: 'accessToken 없음' })

    try {
        // ✅ 2. accessToken이 유효할 경우 → req.user에 정보 넣고 통과
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded;
        return next()
    } catch (error) {
        // ✅ 3. accessToken 만료된 경우 → refreshToken 검증 시도
        if(error.name === 'TokenExpiredError') {
            try {
                const refreshToken = req.cookies.refreshToken;
                if(!refreshToken) {
                    return res.status(401).json({ message: 'Refresh Token 없음' });
                }

                const decodedRefresh = verifyAccessToken(refreshToken);
                const stored = await getRefreshTokenFromDB(decodedRefresh._id);

                // ✅ 5. 유저 정보 가져와서 새로운 accessToken 발급
                const db = await connectDB();
                const user = await db.collection('user').findOne({ _id: new ObjectId(decodedRefresh._id) });

                if(!user) {
                    return res.status(404).json({ message: '유저 없음' });
                }

                const newAccessToken = createAccessToken(user);
                res.cookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'Lax',
                    maxAge: 1000 * 60 * 60, // 1시간
                });

                req.user = {
                    _id: user._id,
                    email: user.email,
                    nickname: user.nickname,
                };

                return next();
            } catch (refreshErr) {
                console.error('RefreshToken 오류:', refreshErr);
                return res.status(403).json({ message: 'Refresh Token 유효하지 않음' });
            }
        }

        console.error('Access Token 오류:', err);
        return res.status(401).json({ message: '유효하지 않은 Access Token' });
    }
};

module.exports = authJWT;
