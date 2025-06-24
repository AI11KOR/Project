const connectDB= require('../config/database');
require('dotenv').config();
const nodemailer = require('nodemailer')

exports.sendBtn = async (req, res) => {
    const db = await connectDB();
    const { email } = req.body;
    if(!email) {
        return res.status(400).json({ message: '이메일을 적어주세요' })
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 이메일로 전송버튼 누를 때 회원가입 유무를 찾기
    const user = await db.collection('user').findOne({ email });

    if(user) {
        return res.status(400).json({ message: '이미 가입된 회원입니다.'})
    }

    const transporter = nodemailer.createTransport({
        service: 'naver',
        auth: {
            user: process.env.NAVER_USER,
            pass: process.env.NAVER_PASS
        }
    })

    const emailOptions = {
        from: process.env.NAVER_USER,
        to: email,
        subject: '인증번호',
        text: `인증번호는 ${code} 입니다.`
    }

    try {
        await transporter.sendMail(emailOptions);
        await db.collection('emailCodes').deleteMany({ email });
        await db.collection('emailCodes').insertOne({
            email, code, createdDate: new Date()
        })

        res.status(200).json({ message: '인증번호 전송 완료, 3분내 입력해주세요' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 에러:', error })
    }

}

exports.verifyBtn = async (req, res) => {
    const db = await connectDB();
    const { email, code } = req.body;
    const recorded = await db.collection('emailCodes').findOne({ email, code })
    if(!recorded) {
        return res.status(400).json({ message: '인증번호가 일치하지 않습니다.' })
    }

    const now = new Date();
    const created = new Date(recorded.createdAt);
    const diff = (now - created) / 1000;

    if(diff > 180) {
        await db.collection('emailCodes').deleteOne({ _id: recorded._id })
        res.status(500).json({ message: '인증 시간 만료' })
    } else {
        await db.collection('emailCodes').deleteOne({ _id: recorded._id })
        res.status(200).json({ message: '인증 번호 확인 완료' })
    }
}