const express = require('express');
const router = express.Router();
const adminCtrl = require('../controller/adminController');
const { isAdmin } = require('../middleware/checkAdmin');
const authJWT = require('../middleware/authJWT');
const { upload, uploadProduct } = require('../middleware/S3_upload')

router.get('/adminPost', authJWT, isAdmin, adminCtrl.adminPosts);

router.delete('/adminPost/delete/:id', authJWT, isAdmin, adminCtrl.adminDeletePost);

// 데이터 파일 저장
router.post('/adminProduct/save', authJWT, isAdmin, uploadProduct.single('image'), adminCtrl.adminInsertProduct)

router.get('/adminProduct', authJWT, isAdmin, adminCtrl.adminGetProduct);

module.exports = router;