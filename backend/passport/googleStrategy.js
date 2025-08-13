const GoogleStrategy = require('passport-google-oauth20').Strategy;
const connectDB = require('../config/database');
const passport = require('passport');
require('dotenv').config();

passport.use(
    new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CLIENT_URL
    },
    async (verifyAccessToken, verifyRefreshToken, profile, done) => {
        try {
            const db = await connectDB();

          // ✅ 기존에는 이메일만 비교했다면
          // const existingUser = await db.collection('user').findOne({ email: profile.emails[0].value });


          // provider까지 조건에 추가
          const existingUser = await db.collection('user').findOne({
            email: profile.emails[0].value,
            provider: 'google',
          });

          if(existingUser) {
            return done(null, existingUser);
          }

          // 없으면 새로 생성
          const newUser = {
            email: profile.emails[0].value,
            nickname: profile.displayName || '구글유저',
            provider: 'google',
            createdAt: new Date(),
          };

          const insertResult = await db.collection('user').insertOne(newUser);
          return done(null, { _id: insertResult.insertedId, ...newUser });


      } catch (err) {
        return done(err, null);
      }
    }
  )
);