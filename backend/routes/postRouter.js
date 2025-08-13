const express = require('express');
const router = express.Router();
const postCtrl = require('../controller/postController')
const authJWT = require('../middleware/authJWT')

router.get('/list', postCtrl.list);

router.post('/write', authJWT, postCtrl.write);

router.get('/detail/:id', postCtrl.detail);

router.post('/view/:id', postCtrl.viewPosts);

router.post('/like/:id', authJWT, postCtrl.likePosts);

router.post('/comment/:id', authJWT, postCtrl.commentWrite); // 댓글 저장

router.get('/comment/:id', postCtrl.getComment) // 댓글 불러오기

router.delete('/comment/:postId/:commentId', authJWT, postCtrl.commentDelete) // 댓글 삭제하기

router.get('/editPage/:id', authJWT, postCtrl.editPage);

router.patch('/edit/:id', authJWT, postCtrl.edit);

router.delete('/delete/:id', authJWT, postCtrl.delete);

router.get('/list/search', postCtrl.searchPosts)

module.exports = router;