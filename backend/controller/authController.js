const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('../config/database');
const generateToken = require('../utils/jwtUtils');
const { ObjectId } = require('mongodb');

exports.login = async (req, res) => {
    try {
        const db = await connectDB();
        const { email, password } = req.body;
        if(!email || !password) {
            return res.status(400).json({ message: '내용을 입력해 주세요' })
        }
        const user = await db.collection('user').findOne({ email })
        if(!user) {
            return res.status(404).json({ message: '회원이 없습니다.' })
        }
        const isValid = await bcrypt.compare(password, user.password);
        if(!isValid) {
            return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' })
        }

        await db.collection('user').findOne({ })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 로그인 에러:', error })
    }
}