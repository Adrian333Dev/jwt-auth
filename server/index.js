const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const router = require('./router/index');
const errorMiddleware = require('./middlewares/error.middleware');

const PORT = process.env.PORT || 5000;

mongoose.set('strictQuery', true);
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use('/api', router);
app.use(errorMiddleware);

const start = async () => {
	try {
		mongoose.connect(process.env.DB_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		app.listen(PORT, () =>
			console.log(
				`Server has been started on port ${process.env.PORT || 5000}...`
			)
		);
	} catch (error) {
		console.log({ error });
	}
};

start();
