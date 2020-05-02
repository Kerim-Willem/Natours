const AppError = require('./../utils/appError');

const handleCastErrorDB = (err) => {
	// for when we put an invalid parameter in for example get tour by id
	const message = `Invalid ${err.path}: ${err.value}.`;
	return new AppError(message, 400);
};

handleDuplicateFieldsDB = (err) => {
	// Using a regular expression to get the name. errmsg is from mongoose. For regular exppresion, I googled: regular expression match text between quotes. To be sure we grag the name, we choose the first element in the array that's being made
	const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
	console.log(value);
	const message = `Duplicate field value: ${value}. Please use another value`;
	return new AppError(message, 400);
};

handleValidationErrorDB = (err) => {
	// we're going to loop over the errors object, to check all the different validators. The object.values are the mongoose objects (like difficulty, name) etc... that have a bunch of extra information inside of them. So with the map function, we're returning the message that the objects return when we call them (validators)
	const errors = Object.values(err.errors).map((el) => el.message);
	// we're doing .join('. ') to separate the input. Otherwise it would be glued together
	const message = `Invalid input data ${errors.join('. ')}`;
	return new AppError(message, 400);
};

// Remember: with es6 we can write a oneline function like this. And, this only runs in production! Prettier-ignore ignores the next line
// prettier-ignore
const handleJWTError = () =>new AppError('Invalid token. Please log in again', 401);

// prettier-ignore
const handleJWTExpiredError = () => new AppError('Token expired. Please log in again', 401);

const sendErrorDev = (err, req, res) => {
	// We want to make sure that in development, we get to see an error page which displays the right errors. And with the production build, that the user just sees a nice error. originalUrl is the entire ulr, but just not with the host so then it looks exactly like the route. An elegant way of doing this is creating an error handler for development and one for production. Now we're doing both at the same time.
	if (req.originalUrl.startsWith('/api')) {
		// res.status.json ends the process, since it sends a response to the user. That's why we don't have to call next() | we need the respons in order to run the code
		res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack
		});
	}
	// B) RENDERED WEBSITE | Before return, we've put an else statement here
	console.error('ERROR 💥', err);
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong!',
		msg: err.message
	});
};
// Operational, trusted error: send message to client. So an operational error is intentional. Like the error when someone GET's a tour that isn't there.
// So basically with the production build we're not seeing the error in the error page, but only with the dev build
const sendErrorProd = (err, req, res) => {
	// A) API
	if (req.originalUrl.startsWith('/api')) {
		// A) Operational, trusted error: send message to client
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message
			});
		}
		// B) Programming or other unknown error: don't leak error details
		// 1) Log error
		console.error('ERROR 💥', err);
		// 2) Send generic message | Before return, we've put an else statement here
		return res.status(500).json({
			status: 'error',
			message: 'Something went very wrong!'
		});
	}

	// B) RENDERED WEBSITE
	// A) Operational, trusted error: send message to client
	if (err.isOperational) {
		console.log(err);
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong!',
			msg: err.message
		});
	}
	// B) Programming or other unknown error: don't leak error details
	// 1) Log error
	console.error('ERROR 💥', err);
	// 2) Send generic message | Before return, we've put an else statement here
	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong!',
		msg: 'Please try again later.'
	});
};

// Global error handler | if we pass in 4 arguments into an express method, express will automatically see it as a error handling middleware, and will only call it when there's an error. Because it's an express error middleware, we don't have to specify it in the folders where we use it. Right now, we're calling this using catchAsync()
module.exports = (err, req, res, next) => {
	// for defining the status code on the error, since not all errors are the same. We want to set a default, because not all errors are created by us. An 'error' comes when there's a 400 or 500 statuscode. The rest is 'fail'
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		// sending meaningful error to client. Dealing with mongoose errors. err will be made from our Error class
		let error = { ...err };
		// If we don't do this, we'll only see the error message in the development build, not in production
		error.message = err.message;
		// handleCastErrorDB comes for example when someone searches for an id that doesn't exist. CastError is from mongoose
		if (error.name === 'CastError') error = handleCastErrorDB(error);
		// 11000 comes for example when we want to create a tour that already exists. 11000 is from mongoose
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		// for Mongoose validators that we defined earlier
		if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
		// for error json webtoken varification. JsonWebTokenError comes from mongoose/jwt
		if (error.name === 'JsonWebTokenError') error = handleJWTError();
		// for when the token is expired
		if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

		sendErrorProd(error, req, res);
	}
};
