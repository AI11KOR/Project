const KakaoStrategy = require('passport-kakao').Strategy;
const passport = require('passport');
require('dotenv').config();
const connectDB = require('../config/database')

passport.use(
    new KakaoStrategy(
    {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
        callbackURL: process.env.KAKAO_CLIENT_URL
},
    async (verifyAccessToken, verifyRefreshToken, profile, done) => {
        console.log('카카오 profile 정보:', profile);

        try {
            const db = await connectDB();
            const existingUser = await db.collection('user').findOne({
                email: profile._json?.kakao_account.email,
                provider: 'kakao',
            });

            if(existingUser) {
                return done(null, existingUser);
            }

            const newUser = {
                email: profile._json.kakao_account.email,
                nickname: profile.username || profile.displayName || '.',
                provider: 'kakao',
                createdAt: new Date(),
            }

            
            const insertResult = await db.collection('user').insertOne(newUser);
            return done(null, { _id: insertResult.insertedId, ...newUser });
            
        //     const kakaoAccount = profile._json?.kakao_account;
        //     const email = kakaoAccount?.email;
        //     const nickname = kakaoAccount?.profile?.nickname || profile.displayName;

        //     if (!email) {
        //         return done(new Error('카카오 로그인에 이메일이 없습니다.'), null);
        //     }

        // // 유저가 존재하는 지 확인
        // let user = await db.collection('user').findOne({ email, provider: 'kakao' });

        // // 없으면 새로 저장
        // if(!user) {
        //     const result = await db.collection('user').insertOne({
        //         email,
        //         nickname,
        //         provider: 'kakao',
        //         createdAt: new Date(),
        //     });
        //     console.log('카카오 사용자 새로 저장됨:', result.insertedId);
        //     user = { _id: result.insertedId, email, nickname };
        // } else {
        //     console.log('기존 카카오 사용자 로그인:', user._id)
        // }

        // console.log('✅ 카카오 로그인 DB 저장 완료:', user);

        // // 기존 유저면 그대로 넘김
        // return done(null, {
        //     _id: user._id,
        //     email: user.email,
        //     nickname: user.nickname,
        // })

        } catch (error) {
            return done(error, null);
        }   
    }
));