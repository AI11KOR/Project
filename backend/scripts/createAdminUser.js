require('dotenv').config({ path: '../.env' });
console.log('✅ Loaded ENV:', process.env.MONGO_ID, process.env.MONGO_PASSWORD, process.env.MONGO_CLUSTER, process.env.MONGO_APPNAME);
const bcrypt = require('bcrypt');
const connectDB = require('../config/database');

const createdAdminUser = async () => {
    const db = await connectDB();

    const email = 'admin@example.com';
    const password = 'rladn523@@';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
        email,
        password: hashedPassword,
        user: '관리자',
        createdAt: new Date()
    };

    try {
        await db.collection('user').insertOne(user);
        console.log('관리자 계정 생성 완료!!!');
    } catch (error) {
        console.error('관리자 계정 생성 실패:', error);
    }
}

createdAdminUser();

