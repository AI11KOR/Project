
exports.isAdmin = (req, res, next) => {
    console.log('✅ [isAdmin] 실행됨');
    console.log('👉 req.user:', req.user); // 확인
    if (!req.user || req.user.email !== 'admin@example.com') {
      return res.status(403).json({ message: '관리자 권한이 없습니다.' });
    }
    next();
  };