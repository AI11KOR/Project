const express = require('express');
const bcrypt = require('bcrypt');
const connectDB = require('../config/database');
const { generateToken, verifyRefreshToken, createAccessToken } = require('../utils/jwtUtils');
const { ObjectId } = require('mongodb');
const { deleteFromS3 } = require('../middleware/S3_upload');

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
        const payload = { 
            _id: user._id, 
            email: user.email, 
            nickname: user.nickname
        };

        // accessToken은 동기 함수로 즉시 JWT 문자열 반환 → await 불필요
        const accessToken = generateToken.createAccessToken(payload);

        // jwtUtils 참고 하면 됨 access는 동기 refresh는 비동기
        // refreshToken은 async 함수(Promise 반환) → await 없으면 [object Promise]가 쿠키에 저장되므로 반드시 await 필요
        const refreshToken = await generateToken.createRefreshToken(payload);

        await generateToken.saveRefreshTokenToDB(user._id, refreshToken); 

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 1000 * 60 * 15, // 15min
            path: '/',
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 1000 * 60 * 60 *24 * 7, // 7day
            path: '/',
        })

        res.status(200).json({ message: '로그인 성공', user: { 
            _id: user._id,
            email: user.email,
            nickname: user.nickname
        } })

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

exports.getUserInfo = async (req, res) => {
    try {
        const db = await connectDB();
        const user = await db.collection('user').findOne({ _id: new ObjectId(req.user._id) })

        if(!user) return res.status(404).json({ message: '유저 정보 없음' })

        res.status(200).json({ email: user.email, nickname: user.nickname });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '유저 정보 조회 실패:', error })
    }
}

// 리프레시 토큰 로그인 유지하기 위한 코드
exports.reissueAccessToken = async (req, res) => {
    try {
        const db = await connectDB();
        const refreshToken = req.cookies.refreshToken;
        if(!refreshToken) 
            return res.status(401).json({ message: 'refreshToken 없음' });

        const decoded = verifyRefreshToken(refreshToken);
        const stored = await generateToken.getRefreshTokenFromDB(decoded._id);
        // console.log('🔍 generateToken:', generateToken);

        if(!stored || stored.token !== refreshToken) {
            return res.status(403).json({ message: 'refreshToken 유효하지 않음' })
        }

        const user = await db.collection('user').findOne({ _id: new ObjectId(decoded._id) });
        
        if(!user) return res.status(404).json({ message: '유저 없음' });

        const payload = {
            _id: user._id,
            email: user.email,
            nickname: user.nickname,
        };

        const newAccessToken = generateToken.createAccessToken(payload);
        
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 1000 * 60 * 15, // 15min
        });

        res.status(200).json({ message: 'accessToken 재발급 성공' })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'refreshToken 유효하지 않음' })
    }
}

exports.logout = (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.status(200).json({ message: '로그아웃 완료' })
}

// 마이 페이지
exports.myPage = async(req, res) => {
    try {
        const db = await connectDB();
        // console.log(typeof req.user._id); // 👉 'string' 또는 'object'
        const userId = String(req.user._id);
        // console.log(typeof req.user._id); // 👉 'string' 또는 'object'
        const objectUserId = new ObjectId(userId);

        const purchase = await db.collection('purchase_item')
        .find({ 'paymentData.userId': objectUserId }) // ✅ 중첩 필드로 수정
        .sort({ createdAt: -1 })
        .toArray()

        const list = await db.collection('post')
        .find({ userId }) // ✅ string 그대로
        .sort({ createdAt: -1 })
        .toArray()

        const user = await db.collection('user').findOne({ _id: new ObjectId(userId) })
        // console.log('🔍 요청한 userId:', userId);
        // console.log('🛒 purchase count:', purchase.length);
        // console.log('📝 list count:', list.length);
        res.status(200).json({ purchaseItem: purchase, userWrite: list, userInfo: user })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 에러:', error })
    }
}

// 마이 페이지 유저 정보 변경
exports.myPageUserChangeInfo = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id; // 여기 req.user는 decoded authJWT에서 verifyAccessToken을 사용
        // 즉, Access Token payload에서 온 것 (_id, nickname, email 등 표기 중 _Id를 말하는 것)
        const { email, nickname, number, address, detailAddr } = req.body;

        await db.collection('user').updateOne({ _id: new ObjectId(userId) },
        { $set: { email, nickname, number, address, detailAddr }}
    )
        res.status(200).json({ message: '유저 정보 변경 성공' })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 에러:', error })
    }
}

// 이미지 변경 설정
exports.imageChange = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id;

        // 기존 이미지 가져오기
        const user = await db.collection('user').findOne({ _id: new ObjectId(userId) });

        // 기존 이미지가 S3에 있는 경우 삭제(url에서 키 추출)
        if(user.image && user.image.includes('amazonaws.com')) {
            const key = user.image.split('/').pop(); // 경로에서 파일명만 추출
            // 위 와 같은 경우 예를들어
            // user.image = "https://woohyunapple.s3.amazonaws.com/profile/1720781900819.png";
            // ["https:", "", "woohyunapple.s3.amazonaws.com", "profile", "1720781900819.png"]
            // pop은 배열의 마지막 요소를 꺼낸다
            // 즉 배열의 마지막 요소은 1720781900819.png ← 이게 S3에 삭제할 Key
           
            await deleteFromS3(key) // 추출한 Key를 기반으로 S3에서 해당 이미지를 삭제하는 함수 호출.
        }

        // 로컬 검토 실제 서비스에서는 S3 URL을 사용
        const imagePath = req.file?.location; // S3의 퍼블릭 URL

        await db.collection('user').updateOne({
             _id: new ObjectId(userId) },
            { $set: { image: imagePath } }
        );
        res.status(200).json({ imageUrl: imagePath })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 이미지 변경 에러:', error })
    }
}