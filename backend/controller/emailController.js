const express = require('dotenv');
const connectDB = require('../config/database');
require('dotenv').config();
const nodemailer = require('nodemailer')

exports.sendBtn = async (req, res) => {
    const db = await connectDB();
    const { email } = req.body;
    const code = await Math.floor(100000 + Math.random() * 900000).toString();

    if(!email) {
        return res.status(400).json({ message: '이메일을 적어주세요' })
    }

    const transporter = nodemailer.createTransport({
        service:'naver',
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
        await db.collection('emailCodes').deleteMany({ email })
        await db.collection('emailCodes').insertOne({
            email, code, createdAt: new Date()
        })
        res.status(200).json({ message: '인증번호 전송 완료. 3분내 입력해 주세요' })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 에러:', error })
    }
}

exports.verifyBtn = async (req, res) => {
    const {email, code } = req.body;
    const db = await connectDB;
    const recorded = await db.collection('emailCodes').findOne({ email, code })

    if(!recorded) {
        return res.status(400).json({ message: '인증번호가 일치하지 않습니다.' })
    }

    const now = new Date();
    const created = new Date(recorded.createdAt);
    const diff = (now - created) / 1000;

    if(diff > 180) {
        await db.collection('emailCodes').deleteOne({ _id: recorded._id })
        return res.status(400).json({ message: '인증번호가 만료되었습니다.' })
    } else {
        await db.collection('emailCodes').deleteOne({ _id: record._id })
        return res.status(200).json({ message: '연결 성공' })
    }
}
