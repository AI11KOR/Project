const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
require('dotenv').config();
const s3 = new S3Client({
    region: 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET
    }
})

// S3에 폴더 추가하기
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'woohyunapple',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: function(req, file, done) {
            const ext = path.extname(file.originalname);
            const fileName = `profile/${Date.now()}${ext}`; // 폴더명 추가!
        done(null, fileName)
        }
    })
});

// 상품 업로드
const uploadProduct = multer({
    // multer-s3는 파일을 s3 버킷에 업로드 하고, req.file?.location 을 통해 S3의 파일 URL을 반환
    //예를 들어, 파일 업로드가 **product/1754738700418.jpg**와 같은 경로로 이루어지면, 
    // req.file?.location은 S3에서 반환한 URL 
    // (https://woohyunapple.s3.ap-northeast-2.amazonaws.com/product/1754738700418.jpg)을 반환
    storage: multerS3({
        s3,
        bucket: 'woohyunapple',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, done) => {
            const ext = path.extname(file.originalname);
            done(null, `product/${Date.now()}${ext}`); // AWS S3에서 저장되는 경로
        }
    })
})

// 프로필 업로드
const uploadProfile = multer({
    storage: multerS3({
        s3,
        bucket: 'woohyunapple',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, done) => {
            const ext = path.extname(file.originalname);
            done(null, `profile/${Date.now()}${ext}`);
        }
    })
})

const deleteFromS3 = async (key) => {
    const command = new DeleteObjectCommand({
      Bucket: 'woohyunapple',
      Key: key,
    });
  
    try {
      await s3.send(command);
      console.log('S3 파일 삭제 성공:', key)
    } catch (error) {
      console.log('S3 파일 삭제 실패:', error)
    }
}

module.exports = {
    upload, uploadProduct, uploadProfile, deleteFromS3
}