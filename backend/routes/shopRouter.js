const express = require('express');
const router = express.Router();
const shopCtrl = require('../controller/shopController');
const authJWT = require('../middleware/authJWT');
const S3upload = require('../middleware/S3_upload');

// 상품 전체 조회
router.get('/shop', shopCtrl.shopStock);

// router.get('/shop/search', shopCtrl.searchProducts);

// 상품 상세
router.get('/stockDetail/:id', shopCtrl.stockDetail);
// TypeError: Cannot read properties of undefined (reading '_id')
//    at exports.cartPage (C:\Users\dngus\OneDrive\바탕 화면\PROJECT3\backend\controller\shopController.js:90:46)
//    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
// 위 에러는 id를 찾을 수 없다는 뜻으로 authJWT를 표시해야 한다 

router.get('/relatedProducts/:category', shopCtrl.relatedProducts);

// 장바구니 페이지 (로그인 필요)
router.get('/cart', authJWT, shopCtrl.cartPage);

// 장바구니에 상품 추가
router.post('/cart', authJWT, shopCtrl.sendProductToCart);

// 장바구니 수량 변경
router.patch('/cart/:id', authJWT, shopCtrl.cartCount);

// 장바구니 데이터 삭제 
router.delete('/cart/:id', authJWT, shopCtrl.cartDelete);

// 장바구니 구매 데이터 전송
router.post('/payment/buy', authJWT, shopCtrl.buyClickBtn);

// 구매 페이지
router.get('/payment', authJWT, shopCtrl.paymentPage);

// 결제 검증 요청
router.post('/payment/verify', authJWT, shopCtrl.verifyPayment);

router.post('/payment/complete', authJWT, shopCtrl.paymentComplete)

module.exports = router;