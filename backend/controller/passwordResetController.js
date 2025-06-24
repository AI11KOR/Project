require('dotenv').config();
const nodemailer = require('nodemailer');
const connectDB = require('../config/database')

exports.sendResetBtn = async (req, res) => {
    const db = await connectDB();
    const { email } = req.body;
    if(!email) {
        return res.status(400).json({ message: '이메일을 적어주세요' })
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
        service:'naver',
        auth: {
            user: process.env.NAVER_USER,
            pass: process.env.NAVER_PASS
        }
    })

    const emailOptions = {
        from:process.env.NAVER_USER,
        to:email,
        subject:'인증번호',
        text:`인증번호는 ${code} 입니다.`
    }

    try {
        await transporter.sendMail(emailOptions);
        await db.collection('emailCodes').deleteMany({ email })
        await db.collection('emailCodes').insertOne({
            email, code, createdAt: new Date()
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '인증번호 전송 실패:', error })
    }
}

exports.verifyResetBtn = async (req, res) => {
    const db = await connectDB();
    const { email, code } = req.body;
    const record = await db.collection('emailCodes').findOne({ email, code })
    if(!record) {
        return res.status(400).json({ message: '인증번호가 일치하지 않습니다.' })
    }

    const now = new Date();
    const created = record.createdAt;
    const diff = (now - created) / 1000;

    if(diff > 180) {
        await db.collection('emailCodes').deleteOne({ _id: record._id })
        return res.status(400).json({ message: '시간이 만료되었습니다.' })
    } else {
        await db.collection('emailCodes').deleteOne({ _id: record._id })
        res.status(200).json({ message: '인증 성공' })
    }
}