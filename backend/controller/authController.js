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
        const payload = { _id: user._id, email: user.email };
        const accessToken = generateToken.createAccessToken(payload);
        const refreshToken = generateToken.createRefreshToken(payload);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60, // 1hour
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 *24 * 7, // 7day
        })

        res.status(200).json({ message: '로그인 성공' })

    } catch (error) {
        console.log('로그인 오류 로그인 에러:', error);
        res.status(500).json({ message: '서버 오류 로그인 에러:', error })
    }
}

exports.register = async (req, res) => {
    try {
        const db = await connectDB();
        const { email, password, nickname, number, postcode, address, detailAddr} = req.body;
        if(!email || !password || !nickname || !number || !postcode || !address || !detailAddr) {
            return res.status(400).json({ message: '회원가입 내용을 입력해주세요' })
        }

        const user = await db.collection('user').findOne({ email });
        if(user) {
            return res.status(404).json({ message: '회원가입한 유저가 존재합니다.' })
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        await db.collection('user').insertOne({
            email, password: hashedPassword, nickname, number, postcode, address, detailAddr, registerDate: new Date()
        })

        res.status(200).json({ message: '회원가입 완료' })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 회원가입 에러:', error })
    }
}

exports.findPassword = async (req, res) => {
    try {
        const db = await connectDB();
        const { email, password } = req.body;
        if(!email || !password) {
            return res.status(400).json({ message: '빈칸을 모두 채워주세요' })
        }
        const user = await db.collection('user').findOne({ email })
        if(!user) {
            return res.status(400).json({ message: '해당 회원이 없습니다.' })
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.collection('user').updateOne({ email }, { $set: {password: hashedPassword, updatePassDate: new Date() } } )

        res.status(200).json({ message: '비밀번호를 변경하였습니다.'})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 비번 변경 에러:', error })
    }
}