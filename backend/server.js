const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const PORT = process.env.PORT = 8000;
const app = express();

const authRouter = require('./routes/authRouter');
const postRouter = require('./routes/postRouter');
const shopRouter = require('./routes/shopRouter');
const adminRouter = require('./routes/adminRouter');
const socialRouter = require('./routes/socialRouter');

// 소셜 로그인을 구현하기 위해서 아래 2줄이 server.js에 필요 연결을 위함
const passport = require('passport');
app.use(passport.initialize());

app.use(cors({
    origin:'http://localhost:3000',
    credentials:true, // 쿠키 주고받기 위한 핵심 옵션
}))

app.use(cookieParser());

app.use(express.json());

// html form 데이터를 파싱하기 위한 미들웨어
// 즉, <form method="POST">처럼 form이 직접 서버에 데이터를 보낼 때 req.body에 파싱된 데이터를 담아주는 역할
// 그러나 현재 axios, FormData를 사용하기 때문에 사용하지않아도 된다. application/json 또는 multipart/form-data입니다.
// app.use(express.urlencoded({ extended: true }));

app.use('/api', authRouter);

app.use('/api', postRouter);

app.use('/api', shopRouter);

app.use('/api', adminRouter);

app.use('/auth', socialRouter);



app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})
