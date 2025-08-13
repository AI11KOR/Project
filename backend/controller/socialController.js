const { generateToken } = require('../utils/jwtUtils');
const connectDB = require('../config/database')

exports.handleGoogleCallback = async (req, res) => {
  try {
    const user = req.user;
    const accessToken = generateToken.createAccessToken(user);
    const refreshToken = await generateToken.createRefreshToken(user);

    // 소셜 로그인 시 백엔드 콜백에서 refreshToken을 db에 저장했는지 확인 코드
    await generateToken.saveRefreshTokenToDB(user._id, refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.redirect('http://localhost:3000');
  } catch (error) {
    console.error('소셜 로그인 처리 실패:', error);
    res.status(500).json({ message: '소셜 로그인 에러' });
  }
};

exports.handleKakaoCallback = async (req, res) => {

    try {
        const db = await connectDB();
        const user = req.user;
        const accessToken = generateToken.createAccessToken(user);
        const refreshToken = await generateToken.createRefreshToken(user);

        // 소셜 로그인 시 백엔드 콜백에서 refreshToken을 db에 저장했는지 확인 코드
        await generateToken.saveRefreshTokenToDB(user._id, refreshToken);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 15,
        })

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 1000 * 60 * 60 * 24 * 7,
        })

        res.redirect('http://localhost:3000')

    } catch (error) {
        console.error('소셜 카카오 로그인 처리 실패:', error);
        res.status(500).json({ message: '카카오 소셜 로그인 에러' })
    }
}

exports.handleNaverCallback = async (req, res) => {


  try {
    const db = await connectDB();
    const user = req.user;
    const accessToken = generateToken.createAccessToken(user);
    const refreshToken = await generateToken.createRefreshToken(user);

    // 소셜 로그인 시 백엔드 콜백에서 refreshToken을 db에 저장했는지 확인 코드
    await generateToken.saveRefreshTokenToDB(user._id, refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    res.redirect('http://localhost:3000');

  } catch (error) {
    console.error('소셜 네이버 로그인 처리 실패:', error);
    res.status(500).json({ message: '네이버 소셜 로그인 에러' })
  }
}