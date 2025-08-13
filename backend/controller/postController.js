const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/database')

exports.list = async (req, res) => {
    try {
        const db = await connectDB();
        const sortType = req.query.sort;

        const perPage = 10;
        const currentPage = parseInt(req.query.page) || 1;
        const totalCount = await db.collection('post').countDocuments(); // 모든 유저 데이터 개수 세는 중
        const totalPage = Math.ceil(totalCount / perPage);

        const sortOption = sortType === 'likes'
        ? { likes: -1}
        : sortType === 'views'
        ? { views: -1 }
        : { writeDate: -1 };

        let result = await db.collection('post')
        .find()
        .sort({ isAdmin: -1, ...sortOption})
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .toArray()

        res.status(200).json({ posts: result, totalPage })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 게시판 데이터 에러:', error })
    }
}

exports.searchPosts = async (req, res) => {
    try {
        const db = await connectDB();
        const { keyword, type } = req.query;
        const query = {};
        if(keyword && type) {
            query[type] = { $regex: keyword, $options: 'i' };
            console.log('검색조건:', query)
        }
        const result = await db.collection('post').find(query).toArray();
        res.status(200).json({ posts: result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 검색 에러:', error })
    }
}

// 조회수 증가
exports.viewPosts = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        await db.collection('post').updateOne({ _id: new ObjectId(postId) },
        { $inc: { views: 1 } }
    );
        res.status(200).json({ message: '조회수 증가 완료' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 조회수 에러:', error })
    }
}


exports.write = async (req, res) => {
    try {
        const db = await connectDB();
        const { title, content } = req.body;
        if(!title || !content) {
            return res.status(400).json({ message: '내용을 입력해 주세요' })
        }

        console.log('작성자 정보:', req.user);

        const isAdmin = req.user.email === 'admin@example.com'

        await db.collection('post').insertOne({
            title, content, writeDate: new Date(),
            userId: req.user._id, 
            email: req.user.email, 
            nickname: req.user.nickname,
            isAdmin,
            likes: 0,
            likesUsers: [],
            comments: [],
            views: 0
        })

        res.status(200).json({ message: '게시글 저장 완료' })

    } catch(error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 글쓰기 에러:', error })
    }
}

exports.detail = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        let result = await db.collection('post').findOne({ _id: new ObjectId(postId) });
        
        if(!result) {
            return res.status(401).json({ message: '게시글이 없습니다.' })
        }

        result.likes = result.likes || 0;
        result.likesUsers = result.likesUsers || [];
        result.comments = result.comments || [];

        res.status(200).json({ posts: result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 상세페이지 연결 에러:', error })
    }
}

exports.likePosts = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        const userId = req.user._id;

        if(!userId) {
            return res.status(401).json({ message: '인증이 필요합니다.' })
        }

        const post = await db.collection('post').findOne({ _id: new ObjectId(postId) })

        if(!post) {
            return res.status(400).json({ message: '게시글이 없습니다.' })
        }

        // 중복 좋아요 방지
        // ✅ ObjectId 통일 후 toString으로 비교
        const userIdStr = userId.toString();
        const likesUserStrArr = post.likesUsers.map(u => u.toString());
        const isLiked = likesUserStrArr.includes(userIdStr);

        if (isLiked) {
            return res.status(400).json({ message: '이미 좋아요 누르셨습니다.' });
        }

        await db.collection('post').updateOne({ _id :new ObjectId(postId) },
        { $inc: { likes: 1}, $push: { likesUsers: userId }}
    )
        res.status(200).json({ message: '좋아요' })
    } catch (error) {
        console.log(error);
    }
}



exports.commentWrite = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        const {comment} = req.body;
        if(!comment) {
            return res.status(400).json({ message: '댓글을 적어주세요'})
        }

        const user = req.user;

        const commentObj = { _id: new ObjectId(), userId: user._id, email: user.email, nickname: user.nickname, comment, date: new Date() }

        await db.collection('post').updateOne({ _id: new ObjectId(postId)}, 
        { $push: { comments: commentObj }}
    )

        res.status(200).json({ message: '댓글 저장 완료', comment: commentObj })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '글쓰기 저장완료 에러:', error })
    }
}

exports.getComment = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;

        const post = await db.collection('post').findOne({ _id: new ObjectId(postId) });

        if(!post) {
            return res.status(404).json({ message: '게시글이 없습니다.' })
        }

        res.status(200).json({
            comments: (post.comments || []).map(comment => ({
              ...comment,
              userId: comment.userId?.toString(), // ← ObjectId → string 변환
            }))
          })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 댓글 오류:', error })
    }
}

exports.commentDelete = async (req, res) => {
    try {
        const db = await connectDB();
        const { postId, commentId } = req.params; // postId 게시글 찾는 용도, commentId: 해당 게시글 삭제할 댓글 찾는 용도
        await db.collection('post').updateOne({ _id: new ObjectId(postId) },
        { $pull: { comments: { _id: new ObjectId(commentId) } } } 
    )

    res.status(200).json({ message: '댓글 삭제 완료' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '댓글 삭제 실패:', error })
    }
}



exports.editPage = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        let result = await db.collection('post').findOne({ _id: new ObjectId(postId) })

        res.status(200).json({ posts: result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 수정 에러:', error})
    }
}

exports.edit = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        const { title, content} = req.body;
        if(!title || !content) {
            return res.status(401).json({ message: '내용을 입력하세요' })
        }
        await db.collection('post').updateOne({ _id: new ObjectId(postId)}, 
        { $set: { title, content, newUpdateWrite: new Date() } }
    )
        res.status(200).json({ message: '글 내용을 수정하였습니다.' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 수정 에러:', error })
    }
}


exports.delete = async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;
        await db.collection('post').deleteOne({ _id: new ObjectId(postId)})
        res.status(200).json({ message: '삭제되었습니다.' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 삭제 에러:', error })
    }
}
