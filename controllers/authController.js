// util is a built in nodejs module. calling promisify through destructuring
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN
	});
};

const createSendToken = (user, statusCode, res) => {
	const token = signToken(user._id);
	// Sending JWT via cookie. The token is what we send in the cookie. Afterwards the options follow
	const cookieOptions = {
		expires: new Date(
			Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
		),
		// So this is making sure we can only access the route when having a valid cookie. Since this creates a problem when trying to logout the user, we're going to create another route for this, which will then return a cookie with the same name, but without the token. We do that with logout
		httpOnly: true
	};
	//  setting it here instead op cookieoptions, otherwise this wouldn't work in development. cookie will only be send on an encrypted connection (https)
	if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

	res.cookie('jwt', token, cookieOptions);

	// Removing password in output. We're doing this so that the password will not be send as a response in the header
	user.password = undefined;

	res.status(statusCode).json({
		status: 'success',
		token,
		data: {
			user
		}
	});
};

exports.signup = catchAsync(async (req, res, next) => {
	// if we would only use , it would create safety issues. Everyone could create an admin account. With this new method, we only allow the data we need to be put into the user. Even when an user would try to put in a role, we wouldn't put that into the user. Using this method, we can no longer register as an admin. If we want to add an admin, we can just go into our database and change the role manually. We could also create a special route for admins. BE AWARE, the User.create is wrong at other sections of this course. In the final github repository, the right code is implemented
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm
	});
	// req.protocal is http/https, the host is the url
	const url = `${req.protocol}://${req.get('host')}/me`;
	console.log(url);
	// So with newUser, we're using the req.body.name to determine the name we're going to fill into our pug template. The url will also get passed into the email function as the second argument. sendWelcome then is what activates the email function in email.js. After we did that, we'll createSendToken
	await new Email(newUser, url).sendWelcome();

	createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
	// destructuring: const email = req.body.email
	const { email, password } = req.body;

	// 1) 1. Check if email and password exist/fields are empty
	if (!email || !password) {
		// we're returning here because after we call the next middleware, we want to make sure the login function finishes right away. If we don't do that, we get the respons cannot send headers after they are sent to the client
		return next(new AppError('Please provide email and password!', 400));
	}
	// 2. Check if user exists && password is correct. Selecting the user by it's email. User.findOne({email: email}).  Because we 'hide' the password in the usermodel, the password will show, even if we would just search for one user. But in order to see if we are dealing with the right user, we need to check the password as well. If we want to select a certain field from the database, we do .select(+AndNameOfWhatYouWantToSelect). if we console.log(user) here, we'll see that the password will come back too. After that, we want to use bcrypt again to compare the encrypted and filled in password. We do this in the usermodel
	const user = await User.findOne({ email }).select('+password');
	// for calling the instance(which is availabe on all the user documents) method that will compare the passwords. Userpassword is the filled in method. This code can't run when there's no user. That's why we move it to the if statement
	// we could've done this seperately, but then we would've given more information to potential hacker(since he knows which one isn't true)
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError('Incorrect email or password', 401));
	}

	// 3) If everything ok, send token to client
	createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
	// loggedout is a dummy text for sending an empty token. Check text at createsendtoken
	res.cookie('jwt', 'loggedout', {
		expires: new Date(Date.now() + 10 * 1000),
		httpOnly: true
	});
	res.status(200).json({ status: 'success' });
};

// middleware funtion for protecting routes by checking wether or not someone has a valid token/is logged in
exports.protect = catchAsync(async (req, res, next) => {
	// 1. Getting token and check if it's there | A common practice is to send the token using a http header with the request. We can set the header in postman. The standard for doing this, is to set (in Postman) the key to Authorization(which we pass in here in req.headers.authorization), and the value to Bearer (since it 'bears' the token). && in this case = if there's a header, and it starts with (startsWith is Javascript). We're splitting the string 'Bearer tokenvalue' to pass only the tokenvalue | headers.authorization doesn't have to be set. The browser knows what to do with it.
	let token;
	if (
		req.headers.authorization &&
		req.headers.authorization.startsWith('Bearer')
	) {
		// here we split bearer from the actual token by making it an array. The token is the second array, therefore [1]
		token = req.headers.authorization.split(' ')[1];
		// So if there's no authorization token in the header, check the cookies for the jwt
	} else if (req.cookies.jwt) {
		token = req.cookies.jwt;
	}

	if (!token) {
		return next(
			new AppError('You are not logged in! Please log in to get access.', 401)
		);
	}

	// 2. Validate/Verification token | We're going to 'promisify' jwt.verify so we can async await this function, since it can take in a callback function. Now promisify(jwt.verify) is a function we need to call, which will then return a promise. We could use a try/catch block here, but we can also use our global error handling middleware | promisify is a node method. Don't forget: You use an async function when working with Promises in the body of the function. The reason why we use Promisify here is because it returns an async function. jwt in itself isn't async, and hashing the token can take up time. In order for Node to execute the code that follows next, without having to wait on the jwt verification, we're wrapping it in promisify. Further more, there are two brackets because: promisify(jwt.verify) Returns the promisified version of jwt.verify as a function and this part: (token, process.env.JWT_SECRET) Executes that function.
	const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

	// 3) Check if user still exists. For what if the user deleted his account, after the token is still active? Or that he changed his password? That it was stolen?
	const currentUser = await User.findById(decoded.id);
	if (!currentUser) {
		return next(
			new AppError(
				'The user belonging to this token does no longer exist.',
				401
			)
		);
	}

	// 4. Check if user changed password after the token was issued. Another instance method/which is available on all the documents (in User model). iat = issued at/created at
	if (currentUser.changedPasswordAfter(decoded.iat)) {
		return next(
			new AppError('User recently changed password! Please log in again.', 401)
		);
	}
	// Only if the steps up above in protect are successfully executed, will next be called and the user allowed to visit the protected route (getAllTours for example). This currentUser now can be used in the next middleware function | If we want to pass information from one middleware to the other, we can store it in the req(uest) object
	// GRANT ACCESS TO PROTECTED ROUTE. Don't forget we can use .locals to access user information in pug templates.
	req.user = currentUser;
	res.locals.user = currentUser;
	next();
});

// Only for rendered pages, no errors here! NO CATCHASYNC ERROR WRAPPER. The reason is, when we leave it and log out, we break the site. Because, the global error handler is sending an error. We don't want to send an error when a user isn;t logged in. We fix this by catching the error locally, and call next().
exports.isLoggedIn = async (req, res, next) => {
	if (req.cookies.jwt) {
		// 1* so if there's not a cookie, we're not saving any user in locals
		try {
			// 1) verify token
			const decoded = await promisify(jwt.verify)(
				req.cookies.jwt,
				process.env.JWT_SECRET
			);

			// 2) Check if user still exists
			const currentUser = await User.findById(decoded.id);
			if (!currentUser) {
				return next();
			}

			// 3) Check if user changed password after the token was issued
			if (currentUser.changedPasswordAfter(decoded.iat)) {
				return next();
			}

			// THERE IS A LOGGED IN USER. with .locals, the pug templates get access to variable 'user'
			res.locals.user = currentUser;
			return next();
		} catch (err) {
			return next();
		}
	}
	// 2* which means we proceed here
	next();
};

// Remember: We have access to the user, because at this point it has succesfully gone through the jwt verification. The user document is available in the request. In the user Model, we specified the user role. We can call the role by req.user.role. This function will only get called if we manually do so in the router. we want to pass in arguments into the middleware in a way that usually doesn't work. ...roles will create an array of all the arguments that are specified. We're putting the middleware function within the ...roles function, as a workaround. req.user in the previous step is absolutely required
exports.restrictTo = (...roles) => {
	return (req, res, next) => {
		// roles is an array, for example ['admin', 'lead-guide']. it starts with the default 'user'. .includes is a javascript method. Were do we get the current rol of the user? We stored it into req.user from exports.protect. 403 = forbidden.
		// roles ['admin', 'lead-guide']. role='user'
		if (!roles.includes(req.user.role)) {
			return next(
				new AppError('You do not have permission to perform this action', 403)
			);
		}

		next();
	};
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
	// Get user based on POSTed email | doing findOne instead of id, since the user doesn't know it's own id
	const user = await User.findOne({ email: req.body.email });
	if (!user) {
		return next(new AppError('There is no user with email address.', 404));
	}

	// generate random reset token. Because there is quite a bit of code, it's better to separate it. Since it's a mongoose method, we're creating it in userModel
	const resetToken = user.createPasswordResetToken();
	// if we leave it like user.save(), we get an error from sign in route; please provide email and password. documentation about validatebeforesave from mongoose: By default, documents are automatically validated before they are saved to the database. This is to prevent saving an invalid document. If you want to handle validation manually, and be able to save objects which don't pass validation, you can set validateBeforeSave to false | If we don't use this, the build in validator from userModel is going to kick in, since we're not providing a password!
	await user.save({ validateBeforeSave: false });

	// 3) send it to user's email. req.protocal is for http/https. We're making sure it works in development and production. We're going to send the plain resetToken and later compare it to the encrypted one | because we want to do more than simply send an error down to the client, we're using the try catch block. We need to set back the pasword reset token, and the password expired
	try {
		const resetURL = `${req.protocol}://${req.get(
			'host'
		)}/api/v1/users/resetPassword/${resetToken}`;
		await new Email(user, resetURL).sendPasswordReset();

		res.status(200).json({
			status: 'success',
			message: 'Token sent to email!'
		});
	} catch (err) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save({ validateBeforeSave: false });

		return next(
			new AppError('There was an error sending the email. Try again later!'),
			// so the reason why we're setting the token to undefined, is because if database access was compromised, then the attacker could use the token to change the user's password. The reason why we're not setting it to undefined when it succeeds, is because we're doing that when the client actually hits the resetpassword route. When he does, we'll set the resettoken to undefined/
			500
		);
	}
});

exports.resetPassword = catchAsync(async (req, res, next) => {
	// 1. get user based on the token. Remember that the reset token that is sent in the url, is the non encrypted token. the one in the database is encrypted. So now we have to encrypt the token from the request, to compare it to the one in the database. We specified the param to token in userroutes
	const hashedToken = crypto
		.createHash('sha256')
		.update(req.params.token)
		.digest('hex');

	// The only thing we know about the user is the token. So now we're quering through the database, to find the token from the user that matches. So we're looking for the hashed token from the field passwordResetToken. At the same time we check if the date of passwordResetToken is greater then now, so we'll know if the 10 min has been perceeded. Remember that with the route 'forgotpassword' we created the field passwordResetToken in our userModel. We're using that to compare with the reset token that has been sent in the header, which is linked to in the email that we've send.
	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpires: { $gt: Date.now() }
	});

	// 2. if token has not expired, and there is a user, set the new passwordConfirm
	if (!user) {
		return next(new AppError('Token is invalid or has expired', 400)); // 400 is bad request
	}
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	user.passwordResetToken = undefined;
	user.passwordResetExpires = undefined;
	// in this case we want to validate, so we're leaving save() empty
	await user.save();

	// 3. Update changedPasswordAt property for the user. We're using middleware for this

	// log the user in, send JWT
	createSendToken(user, 200, res);
});

// only for logged in users. We need to confirm the password again
exports.updatePassword = catchAsync(async (req, res, next) => {
	// 1. Get user from collection
	const user = await User.findById(req.user.id).select('+password');

	// 2. Check if POSTed password is correct. Remember that passwordCurrent is the argument created on the input of the client
	if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
		return next(new AppError('Your password is incorrect', 401));
	}
	// 3. If so, update the password. Validation will happen automatically
	user.password = req.body.password;
	user.passwordConfirm = req.body.passwordConfirm;
	// we didn't use findByIdAndUpdate because: the validation is not going to work. The password isn't defined when we update. Look at userModel passwordConfirm. Never use update everything involving update. Also, the userSchema.pre wouldn't work
	await user.save();

	// 4. Log user
	createSendToken(user, 200, res);
});
