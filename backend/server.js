const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const PORT = process.env.PORT = 8000;
const app = express();


app.use(cors({
    origin:'http://localhost:3000',
    credentials:true,
}))

app.use(cookieParser());

app.use(express.json());

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`)
})
