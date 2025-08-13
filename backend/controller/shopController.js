const express = require('express');
const connectDB = require('../config/database');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const https = require('https')
require('dotenv').config();

// 상품 데이터 불러오기 get, 검색기능 포함
exports.shopStock = async (req, res) => {
    try {
        const db = await connectDB();
        const perPage = 6;
        const currentPage = parseInt(req.query.page) || 1;

        const category = req.query.category;
        const search = req.query.search;

        const query = {}; // category 조건 적용
        if(category) query.category = category;
        if(search) query.name = { $regex: search, $options: 'i' };

        const totalCount = await db.collection('products').countDocuments(query);
        const totalPage = Math.ceil(totalCount / perPage);

        const result = await db.collection('products')
        .find(query)
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .toArray();
        res.status(200).json({ product: result, totalPage });

    } catch (error) {
        console.log(error);
        res.status(500).json({message: '서버 오류 상품 불러오기 에러:', error })
    }
}



// 상품 상세 페이지
exports.stockDetail = async (req, res) => {
    try {
        const db = await connectDB();
        
        console.log(req.params.id)
        console.log(parseInt(req.params.id))
        const id = req.params.id;
        // const productId = parseInt(req.params.id);
        // if(!productId) {
        //     return res.status(400).json({ message: '상세 페이지 항목을 찾을 수 없습니다.' })
        // }

        const result = await db.collection('products').findOne({ _id: new ObjectId(id) })
        // const result = await db.collection('products').findOne({ id: productId })
        if(!result) {
            return res.status(401).json({ message: '해당 상품을 찾을 수 없습니다.' })
        }
        
        res.status(200).json({ product: result })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 상세 페이지:', error })
    }
}

// 상품 상세페이지 연관 상품목록
exports.relatedProducts = async (req, res) => {
    try {
        const db = await connectDB();
        const { category } = req.params;
        const excludeId = req.query.excludeId;

        const related = await db.collection('products')
        .find({ category, _id: { $ne: new ObjectId(excludeId) } } ) // 본인 상품 제외
        .toArray()

        res.status(200).json({ products: related })

    } catch (error) {
        console.log('관련 상품 가져오기 실패:', error);
        res.status(500).json({ message: '서버 오류 연관 상품 가져오기 에러:', error })
    }
}


// 상세 페이지에서 장바구니 담기 버튼 클릭시 데이터 전달
exports.sendProductToCart = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id; // authJWT가 넣은 값값
        const { productId, name, image, price, quantity } = req.body;
        const quantityNum = Number(quantity);

        if(!productId || !name || !price || quantityNum  === undefined || quantityNum  === null || isNaN(quantityNum )) {
            return res.status(400).json({ message: '필수 항목이 누락되었습니다.' })
        }
        console.log('회원가입한 유저의 _id userId:', userId);
        console.log('장바구니에 담은 상품의 _id productId:', productId);

        // if(!productId || !name || !price || !quantity) {
        //     return res.status(400).json({ message: '필수 항목이 누락되었습니다.' })
        // }

        // 같은 상품이 담겨 있을 경우 수량만 추가
        const existingItem = await db.collection('cart').findOne({
            id: String(userId), productId
        })

        // if문을 통해서 만약 상품이 존재한다면 수량만 업데이트
        if(existingItem) {
            await db.collection('cart').updateOne({ _id: existingItem._id },
                { $inc: { quantity: quantityNum } }
            );
        } else {
            // 상품이 존재 하지 않는다면 새로 추가
            await db.collection('cart').insertOne({
                id: String(userId),
                productId, name, image, price, quantity, createdAt: new Date()
            })
        }

        res.status(200).json({ message: '장바구니에 저장되었습니다.'})
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 장바구니 추가 실패:', error })
    }
}

// 상품 장바구니 페이지
exports.cartPage = async (req, res) => {
    try {
        const db = await connectDB();
        const perPage = 5;
        const currentPage = parseInt(req.query.page) || 1;

        const userId = String(req.user._id);

        // 현재 로그인한 유저 데이터만 가져옴
        const totalCount = await db.collection('cart').countDocuments({ id: userId });
        const totalPage = Math.ceil(totalCount / perPage);


        
        console.log('userId:', typeof userId, userId); // 👈 중요
        const result = await db.collection('cart')
        .find({ id: userId })
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
        .toArray()

        console.log('🟩 가져온 장바구니 데이터:', result); // 🔍 실제로 어떤 데이터인지 확인
        
        res.status(200).json({ cart: result, totalPage })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 장바구니 페이지 오류:', error })
    }
}

// 장바구니 수량 변경
exports.cartCount = async (req, res) => {
    try {
        const db = await connectDB();
        const cartItemId = req.params.id;
        const { quantity } = req.body;
        console.log('quantity:', quantity)
        await db.collection('cart').updateOne({ _id: new ObjectId(cartItemId) },
        { $inc : { quantity: quantity }}
    )
        res.status(200).json({ message: '수량 변경 완료' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 장바구니 수량 변경 에러:', error })
    }
}

// 장바구니 페이지 상품 삭제
exports.cartDelete = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id; // login한 유저의  Mongodb _id
        const cartItemId = req.params.id; // 삭제할 장바구니 상품
        console.log('삭제 요청 id:', cartItemId);
        console.log('요청자 userId:', userId);

        // cartItemId에 해당하는 장바구니 항목 삭제
        const result = await db.collection('cart').deleteOne({
            _id: new ObjectId(cartItemId), // ✅ ObjectId로 변환해야 함
            id: userId.toString()          // ✅ 문자열 그대로 비교
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: '삭제할 장바구니 항목을 찾을 수 없습니다.' });
        }


        res.status(200).json({ message: '데이터 삭제 완료' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 상품 삭제 에러:', error })
    }
}



// 장바구니에서 구매하기 버튼을 누를 경우 post로 데이터 보내기
exports.buyClickBtn = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id;
        const { items, totalPrice, totalQuantity } = req.body; // Cart.jsx 123~125줄이 배열을 나타내기에
        
        // const items = req.body 에러 발생으로 const items = req.body.items로 처리해야 함
        if(!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: '구매할 상품이 없습니다.' })
        }

        // 데이터가 어떻게 왔는지 제대로 왔는지 파악하기 위해 위에 선언한 것을 확인하기 위함
        console.log('🛒 받은 items:', items);
        console.log('🛒 받은 totalPrice:', totalPrice);
        console.log('🛒 받은 totalQuantity:', totalQuantity);
        console.log('✅ [buyClickBtn] 받은 items:', req.body.items);

        const productsToInsert = items.map(item => ({
            userId: new ObjectId(userId),
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 0, // 프론트는 quantity로 보냄
            cartId: item.cartId, // cart 문서의 _id (문자열)
            description: item.description || '',
            image: item.image,
            createdAt: new Date(),
        }));



        console.log('📦 DB에 넣을 데이터:', productsToInsert);

        // payment 컬렉션을 “이번 결제에 사용할 최신 선택 목록”만 유지하는 임시 저장소로 쓰기 위함
        // 사용자가 장바구니에서 다시 선택하고 “구매하기”를 여러 번 눌러도, 예전 선택이 남아있으면 
        // 결제 페이지에 중복/엉뚱한 아이템이 섞일 수 있음
        // 그래서 기존 껄 싹 지우고 이번에 선택한 것만 넣는다 그렇게 결제 페이지는 항상 가장 최신인 선택만 보여줌
        

        // 구매 버튼 클릭 시 기존 구매 내역 삭제 후 삽입, 기존 임시 데이터 제거 후 삽입
        await db.collection('payment').deleteMany({ userId: new ObjectId(userId) })

        await db.collection('payment').insertMany(productsToInsert)

        // 추가 로그
        const saved = await db.collection('payment').find({ userId: new ObjectId(userId) }).toArray();
        console.log('📦 [buyClickBtn] payment 컬렉션에 저장된 데이터:', saved);

        res.status(200).json({ message: '구매페이지로 데이터 전송' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류 구매 에러:', error })
    }
}

// 구매페이지
exports.paymentPage = async (req, res) => {
    try {
      const db = await connectDB();
      const userId = req.user._id;
  
      console.log('🧪 accessToken 디코딩된 _id 타입:', typeof userId);
  
      const items = await db
      .collection('payment')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

      // 유저 정보를 조회하여 해당되는 데이터를 가져오기 위함
        const userResult = await db.collection('user').findOne({
        _id: new ObjectId(userId),
        });
  
      // 결제 내역이 없을 경우
      if (items.length === 0) {
        return res.status(200).json({ payment: [], user: userResult });
      }
  
        // payment 컬렉션 문서 자체가 아이템 1개씩이므로 그대로 반환
        // (필드: name, price, quantity, cartId, createdAt, userId)
        return res.status(200).json({ payment: items, user: userResult });

    } catch (error) {
      console.log('❌ paymentPage 오류:', error);
      res.status(500).json({ message: '구매 페이지 불러오기 실패:', error });
    }
  };


// 구매할 경우 iamport 사용해서 처리하는 코드
exports.verifyPayment = async (req, res) => {
    const { imp_uid } = req.body;

    try {
        // iamport 토큰 발급
        const tokenRes = await axios.post('https://api.iamport.kr/users/getToken', {
            imp_key: process.env.IAMPORT_API_KEY,
            imp_secret: process.env.IAMPORT_API_SECRET,
          });

        const access_token = tokenRes.data.response.access_token;

        // 결제정보 검증
        // 실제 배포할 때는 httpsAgent를 반드시 제거해야 함 개발환경에선 임시로 허용
        const httpsAgent = new https.Agent({ rejectUnauthorized: false }); // TLS 우회 설정

        const paymentData = await axios.get(
            `https://api.iamport.kr/payments/${imp_uid}`,
            {
              headers: { Authorization: access_token },
              httpsAgent, // 추가된 부분
            }
          );
      
          const { amount, status } = paymentData.data.response;
      
          // 3. 검증 성공 응답
          res.status(200).json({ success: true, amount, status });

    } catch (error) {
        console.error('❌ 결제 검증 실패:', error);
        res.status(500).json({ success: false, message: '결제 검증 실패', error });
    }
}


// 구매처리가 될 경우 해당 구매내역 db에 저장
exports.paymentComplete = async (req, res) => {
    try {
        const db = await connectDB();
        const userId = req.user._id;
        const { imp_uid, items, totalPrice, totalQuantity } = req.body;

        const paymentData = {
            userId: new ObjectId(userId),
            imp_uid,
            items, // [{ cartId, title, price, quantity }]
            totalPrice,
            totalQuantity,
            createdAt: new Date(),
        }

        // await db.collection('purchase_item').insertOne({paymentData})
        await db.collection('purchase_item').insertOne(paymentData); // ✅ 래핑 제거

        // 구매 완료 후 장바구니 선택한 것 비우기
        // const productIds = items.map(item => new ObjectId(item.cartId)); // ✅ cart의 _id 기반

        // ObjectId.isValid: 문자열 cartId가 몽고DB의 ObjectId로 정상 변환 가능한지 미리 걸러서, 잘못된 값 때문에 에러 나거나 삭제가 통째로 실패하는 걸 막음
        // 검사 기준: 보통 24자리 hex 문자열(예: "66a1b2c3d4e5f6a7b8c9d0e1")이면 true

        // new ObjectId() vs ObjectId 차이
        // ObjectId는 클래스/생성자, new ObjectId('...')는 실제 인스턴스(값)
        // 몽고 드라이버 연산자(예: _id: { $in: [...] })에는 인스턴스가 필요, 그래서 문자열 cartId → new ObjectId(cartId) 로 변환
        const productIds = items
            .map(item => (ObjectId.isValid(item.cartId) ? new ObjectId(item.cartId) : null))
            .filter(Boolean); // .filter(Boolean)은 배열에서 falsy 값(예: null, undefined, '', 0, false, NaN)을 제거
            // 즉, 유효한 ObjectId만 남김

            if (productIds.length === 0) {
                console.log('삭제할 cartId가 유효하지 않습니다:', items.map(i => i.cartId));
                return res.status(400).json({ message: '유효하지 않은 cartId입니다.' });
            }

        console.log('삭제할 productIds:', productIds);

        console.log('🧾 [paymentComplete] 결제 시 받은 items:', items);

        console.log('타입 체크:', typeof productIds[0], productIds[0] instanceof ObjectId);

        // 장바구니 선택한 상품 db에서 삭제하기 문자열 기반 조건
        // 장바구니에서 삭제
        const deleted = await db.collection('cart').deleteMany({
            id: String(userId),          // 사용자 식별 필드(문자열) 유지
            _id: { $in: productIds },    // ObjectId 배열
        });

        console.log('🟡 삭제 조건:', {
            id: String(userId),
            _id: { $in: productIds }, // ✅ 수정된 조건 로그도 일치하게
        });

        // 삭제 디버깅용
        console.log('🧹 삭제 대상 ID:', productIds);
        console.log('🧹 삭제된 개수:', deleted.deletedCount);

        // 장바구니 상태 확인
        const sample = await db.collection('cart').find({ id: String(userId) }).toArray();
        console.log('현재 장바구니 상태:', sample);

        // ✅ [추가 권장] 결제 완료 후 payment 임시데이터 정리
        await db.collection('payment').deleteMany({ userId: new ObjectId(userId) });

        res.status(200).json({ message: '결제 정보 저장 완료' })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: '서버 오류:', error })
    }
}