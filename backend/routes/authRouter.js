const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const emailCtrl = require('../controller/emailController')
const resetCtrl = require('../controller/passwordResetController')

router.post('/login', authCtrl.login)

router.post('/register', authCtrl.register);

router.post('/send-email', emailCtrl.sendBtn);

router.post('/verify-email', emailCtrl.verifyBtn);

router.post('/reset/send-email', resetCtrl.sendResetBtn);

router.post('/reset/verify-email', resetCtrl.verifyResetBtn);

router.post('/findPassword', authCtrl.findPassword);


module.exports = router;