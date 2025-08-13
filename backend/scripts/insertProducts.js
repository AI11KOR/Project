const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const id = encodeURIComponent(process.env.MONGO_ID);
const password = encodeURIComponent(process.env.MONGO_PASSWORD);
const cluster = process.env.MONGO_CLUSTER;
const appName = process.env.MONGO_APPNAME;
const url = `mongodb+srv://${id}:${password}@${cluster}/?retryWrites=true&w=majority&appName=${appName}`;
const dbName = 'forum';

const categories = ['car', 'cloth', 'pants', 'perfume', 'shoes'];
const dataPath = path.join(__dirname, '../data');

async function insertProducts() {
    const client = new MongoClient(url);

    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection('products');

        await collection.deleteMany(); // 기존 데이터 제거 (초기화 목적)

        for (const category of categories) {
            const filePath = path.join(dataPath, `${category}.json`);
            const file = fs.readFileSync(filePath, 'utf-8');
            const products = JSON.parse(file);
            await collection.insertMany(products);
            console.log(` ${category}데이터 삽입 완료`);
        }
        console.log('전체 데이터 마이그레이션 완료!');
    } catch (error) {
        console.error('에러 발생:', error);
    } finally {
        await client.close();
    }
}

insertProducts();

// 이후 터미널에서 node scripts/insertProducts.js
// 이때는 반드시 backend 경로에서 해야 함
// 만약 최상단 폴더에서 한다면 node backend/scripts/insertProducts.js
// 명심할것 항상 내 경로위치가 어디냐에 따라서 달라진다. 간단하지만 중요한 포인트