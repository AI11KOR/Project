const connectDB = require('../config/database');
const express = require('express');
const { ObjectId } = require('mongodb');
const { deleteFromS3 } = require('../middleware/S3_upload');
require('dotenv').config(); // ✅ 환경변수는 따로 불러와야 함

// 관리자 게시판 페이지
exports.adminPosts = async (req, res) => {
    try {
        const db = await connectDB();
        const perPage = 10;
        const currentPage = parseInt(req.query.page) || 1;
        const totalCount = await db.collection('post').countDocuments();
        const totalPage = Math.ceil(totalCount / perPage); // 총 페이지 계산

        const result = await db.collection('post')
        .find()
        .skip((currentPage -1) * perPage)
        .limit(perPage)
        .toArray();

        // 전체 게시글 수
        const totalPostCount = await db.collection('post').countDocuments();
        // countDocuments()는 컬렉션 내 문서(=데이터)의 개수를 세는 함수


        // 가장 글을 많이 쓴 유저
        const mostActiveUser = await db.collection('post').aggregate([ // 집계 연산(aggregate)
            // 닉네임 기준으로 그룹을 지어서, 각 유저가 쓴 글 개수(count)를 셈 
            { $group: { _id: '$nickname', count: { $sum: 1 } } },
            { $sort: { count: -1} }, // → count 기준으로 내림차순 정렬 (많이 쓴 유저가 제일 위)
            { $limit: 1 } // 가장 많이 쓴 유저 한 명만
        ]).toArray();

        const topNickname = mostActiveUser[0]?._id || '없음';
        // mostActiveUser[0]._id가 바로 닉네임


        res.status(200).json({ posts: result, totalPage, totalPostCount, topNickname})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 에러:', error })
    }
}

// 관리자 게시글 삭제
exports.adminDeletePost = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;

        await db.collection('post').deleteOne({ _id: new ObjectId(postId) });
        res.status(200).json({ message: '삭제 완료' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '삭제 오류 에러:', error })
    }
}


// 관리자 상품 정보 불러오기, 정렬, 검색 등
exports.adminGetProduct = async (req, res) => {
    try {
        const db = await connectDB();
        const perPage = 10; // 한 페이지당 보여줄 데이터 개수
        const currentPage = parseInt(req.query.page) || 1; // 쿼리스트링 /api/...?page=2 -> currentPage = 2

        const { category, keyword, type } = req.query;

        const query = {};
        if(category && category !== '전체' && category !== '') {
            query.category = category;
        }

        if(type && keyword) { // type은 검색하고 싶은 필드명
            query[type] = { $regex: keyword, $options: 'i' };
        }
        // console.log('검색:', query)

        // 현재 조건에 맞는 전체 데이터 개수 셈, query가 있다면 검색, 필터링 기준으로 카운트 함
        const totalCount = await db.collection('products').countDocuments(query);

        // 전체 페이지 수 계산 Math.ceil은 나머지가 있으면 올림 perPage=10이고 전체가 32면 4페이지가 됨
        const totalPage = Math.ceil(totalCount / perPage);

        const productList = await db.collection('products')
        .find(query)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .toArray();

        res.status(200).json({ products: productList, totalPage })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '상품 목록 불러오기 실패:', error })
    }
}



// 관리자 상품 삭제
exports.adminDeleteProduct = async (req, res) => {
    try {
        const db = await connectDB();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '상품 삭제 오류 에러:', error })
    }
}

// 관리자 상품 등록
exports.adminInsertProduct = async (req, res) => {

    console.log('✅ 요청 도달 확인');
    console.log('👉 req.user:', req.user); // undefined이면 인증 실패
    console.log('👉 req.body:', req.body);
    console.log('👉 req.file:', req.file);

    if (!req.user) return res.status(401).json({ message: '인증 정보 없음' });
    if (req.user.email !== 'admin@example.com') return res.status(403).json({ message: '관리자만 접근 가능' });


    try {
        const db = await connectDB();
        const { category, name, description, price } = req.body;
        const image = req.file?.location; // AWS S3에서 반환한 이미지 URL
        // multer-s3는 파일을 s3에 업로드한 후 req.file 객체에 해당 파일의 데이터를 포함시킨다.
        // req.file?.location은 s3에서 반환된 파일 url로, 이 url을 db에 저장하여 파일 경로를 관리함

        if (isNaN(price)) {
            return res.status(400).json({ message: '가격은 숫자로 입력해야 합니다.' });
        }

        if (!req.file) return res.status(400).json({ message: '이미지를 업로드해야 합니다.' });


        if(!category || !name || !description || isNaN(price)) {
            return res.status(400).json({ message: '필수 항목 누락'})
        }

        const priceNumber = Number(price);


        await db.collection('products').insertOne({
            category, name, description, price: priceNumber, image, createdAt: new Date()
        })

        res.status(200).json({ message: '상품등록 완료'})

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '관리자 상품 등록 에러:', error })
    }
}

