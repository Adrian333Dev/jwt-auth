const bcrypt = require('bcrypt');
const uuid = require('uuid');

const UserModel = require('../models/user.model');
const UserDto = require('../dtos/user.dto');

const mailService = require('./mail.service');
const tokenService = require('./token.service');

const ApiError = require('../exceptions/api-error.exception');

class UserService {
	async registration(email, password) {
		const candidate = await UserModel.findOne({ email });
		if (candidate)
			throw new ApiError.BadRequest(`User with email ${email} already exists`);

		const hashPassword = await bcrypt.hash(password, 3);
		const activationLink = uuid.v4();
		const user = await UserModel.create({
			email,
			password: hashPassword,
			activationLink,
		});
		await mailService.sendActivationMail(
			email,
			`${process.env.API_URL}/api/activate/${activationLink}`
		);

		const userDto = new UserDto(user); // {email, id, isActivated}
		const { accessToken, refreshToken } = tokenService.generateTokens({
			...userDto,
		});
		await tokenService.saveToken(userDto.id, refreshToken);

		return { user: userDto, accessToken, refreshToken };
	}

	async activate(activationLink) {
		const user = UserModel.findOne({ activationLink });
		if (!user) throw new ApiError.BadRequest('Incorrect activation link');
		user.isActivated = true;
		await user.save();
	}

	async login(email, password) {
		const user = await UserModel.findOne({ email });
		if (!user)
			throw new ApiError.BadRequest(`User with email ${email} not found`);

		const isPassEquals = await bcrypt.compare(password, user.password);
		if (!isPassEquals) throw new ApiError.BadRequest('Incorrect password');

		const userDto = new UserDto(user);
		const { accessToken, refreshToken } = tokenService.generateTokens({
			...userDto,
		});
		await tokenService.saveToken(userDto.id, refreshToken);
		return { user: userDto, accessToken, refreshToken };
	}

	async logout(refreshToken) {
		const token = await tokenService.removeToken(refreshToken);
		return token;
	}

	async refresh(refreshToken) {
		if (!refreshToken) throw new ApiError.UnauthorizedError();
		const userData = tokenService.validateRefreshToken(refreshToken);
		const tokenFromDb = await tokenService.findToken(refreshToken);
		if (!userData || !tokenFromDb)
			throw new ApiError.UnauthorizedError();

		const user = await UserModel.findById(userData.id);
		const userDto = new UserDto(user);
		const tokens = tokenService.generateTokens({ ...userDto });
		await tokenService.saveToken(userDto.id, tokens.refreshToken);
		return { ...tokens, user: userDto };
	}

	async getAllUsers() { 
		const users = await UserModel.find();
		return users;
	}
}

module.exports = new UserService();
