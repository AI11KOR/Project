const NaverStrategy = require('passport-naver').Strategy;
const connectDB = require('../config/database');
const passport = require('passport');
require('dotenv').config();


passport.use(
    new NaverStrategy(
    {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: process.env.NAVER_CLIENT_URL
},
    async (_accessToken, _refreshToken, profile, done) => {
        console.log('네이버 profile 정보:', profile);

        try {
            const db = await connectDB();
            // 안전 추출
            const provider = 'naver';
            const providerId = profile.id; // 항상 존재
            const rawEmail =
              profile?.emails?.[0]?.value ||
              profile?._json?.email ||
              null;
    
            // ✅ 네이버 전용: 이메일 없으면 대체 이메일 생성
            const email = rawEmail || `naver_${providerId}@login.invalid`;


        const nickname =
          profile?.displayName ||
          profile?._json?.nickname ||
          `네이버_${providerId.slice(-4)}`;

        // 1) provider+providerId 로 조회 (이메일 의존 X)
        let user = await db.collection('user').findOne({ provider, providerId });

        if (!user) {
          // 2) 없으면 생성 (email은 null 허용)
          const newUser = {
            provider,
            providerId,
            email,       
            nickname,
            createdAt: new Date(),
          };
          const { insertedId } = await db.collection('user').insertOne(newUser);
          user = { _id: insertedId, ...newUser };
        } else {
            // 3) 기존 유저의 email이 없으면 보강
            if (!user.email) {
              await db.collection('user').updateOne(
                { _id: user._id },
                { $set: { email } }
              );
              user.email = email;
            }
            // 닉네임도 비어있으면 보강(선택)
            if (!user.nickname && nickname) {
              await db.collection('user').updateOne(
                { _id: user._id },
                { $set: { nickname } }
              );
              user.nickname = nickname;
            }
          }
  
          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );


// console.log('NAVER_CLIENT_URL=', process.env.NAVER_CLIENT_URL)

// passport.use(
//     new NaverStrategy(
//     {
//         clientID: process.env.NAVER_CLIENT_ID,
//         clientSecret: process.env.NAVER_CLIENT_SECRET,
//         callbackURL: process.env.NAVER_CLIENT_URL
//     },

    
//     // 콜백 시그니처는 accessToken, refreshToken, profile, done
//     async (_accessToken, _refreshToken, profile, done) => {
//         try {
//             const db = await connectDB();

//           // ✅ 이메일 안전 파싱 (콘솔 동의항목에 따라 위치가 다를 수 있음)
//         const email =
//         profile?.emails?.[0]?.value || // 표준 위치
//         profile?._json?.email ||        // 일부 구현에서 여기로 옴
//         null;

//         // [추가] 네이버 고유 ID (항상 존재)
//         const provider = 'naver';
//         const providerId = profile.id;

//         // if(!email) {
//         // // 이메일을 콘솔에서 '필수'로 설정하지 않으면 null 가능
//         // // 서비스 정책에 맞게 처리: 막거나 대체키 사용(네이버 id)
//         //     return done(new Error('네이버에서 이메일을 제공하지 않았습니다.'), null)
//         // }

//         const nickname =
//             profile?.displayName ||
//             profile?._json?.nickname ||
//             '네이버유저'; // [추가]


//           // provider까지 조건에 추가
//           const existingUser = await db.collection('user').findOne({
//             provider,
//             providerId,
//           });

//           if (existingUser) {
//             // [선택] 기존 유저에 email이 비어 있고 이번에 들어왔으면 업데이트
//             if (!existingUser.email && email) {
//               await db.collection('user').updateOne(
//                 { _id: existingUser._id },
//                 { $set: { email } }
//               );
//               existingUser.email = email;
//             }
//             return done(null, existingUser);
//           }

//           // 없으면 새로 생성
//           const newUser = {
//             provider,
//             providerId,
//             email: email || null,     // [변경] null 허용
//             nickname,
//             createdAt: new Date(),
//           };

//           const insertResult = await db.collection('user').insertOne(newUser);
//           return done(null, { _id: insertResult.insertedId, ...newUser });


//       } catch (err) {
//         return done(err, null);
//       }
//     }
//   )
// );