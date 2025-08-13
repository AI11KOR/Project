const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const emailCtrl = require('../controller/emailController')
const resetCtrl = require('../controller/passwordResetController')
const authJWT = require('../middleware/authJWT')
const { upload } = require('../middleware/S3_upload')

router.post('/login', authCtrl.login)

router.post('/register', authCtrl.register);

router.post('/send-email', emailCtrl.sendBtn);

router.post('/verify-email', emailCtrl.verifyBtn);

router.post('/reset/send-email', resetCtrl.sendResetBtn);

router.post('/reset/verify-email', resetCtrl.verifyResetBtn);

router.post('/findPassword', authCtrl.findPassword);

router.get('/user/info', authJWT, authCtrl.getUserInfo);

router.post('/token/reissue', authCtrl.reissueAccessToken);

router.post('/logout', authCtrl.logout);

router.get('/check-auth', authJWT, (req, res) => {
    // accessToken이 유효하거나, refreshToken으로 재발급 성공하면 여기에 도착
    res.status(200).json({ user: req.user }); // 로그인된 사용자 정보 반환
})

// router.post('/refresh', authCtrl.reissueAccessToken);

router.get('/myPage', authJWT, authCtrl.myPage);

router.patch('/myPage/userInfo', authJWT, authCtrl.myPageUserChangeInfo);

// 이미지 변경
router.post('/myPage/uploadImage', authJWT, upload.single('profileImage'), authCtrl.imageChange);


// 로그인 성공시 확인용
router.get('/me', authJWT, (req, res) => {
    res.json({ user: req.user })
})


module.exports = router;