const path = require('path');
// to start the server(before declaring in package-json), terminal: nodemon app.js
const express = require('express');
// morgan is third party middleware for logging requests
const morgan = require('morgan');
// Global Middleware The rate limiter is going to count the number of requests of one ip, and then when there are too many requests, block these requests
const rateLimit = require('express-rate-limit');
// business standard for setting HTTPS
const helmet = require('helmet');
// protection against sql injection
const mongoSanitize = require('express-mongo-sanitize');
// against xss attacks
const xss = require('xss-clean');
// Parameter pollution | We need it in order to remove duplicate fields. Hackers can use this. Didn't understand it completely but it's important!
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
// Middleware
const compression = require('compression');
const AppError = require('./utils/appError');
// because we're not calling the exported module.exports in particular, we can call it however we like. It doesn't matter
const globalErrorHandler = require('./controllers/errorController');
// everything related to locations, are going to be stored in the tour model
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// PUG TEMPLATES. (Actually we do need to install pug!) Express supports the most common template eniges, like pug. That's why we don't need to install it or require anywhere. It all happens within express. Pug templates are called views in express. With the Views added to our code, we've completely implemented the MVC architecture in our application. Model / View / Controller.
app.set('view engine', 'pug');
// the path is always relative to the directory from where we launch the node application. That usually is the root folder, but it doesn't have to be. That's why we don't use './view' to locate the views, but the directory variable. We do this with the node module path, which is used to manipulate path names. This:path.join(__dirname, 'views') behind the scenes will join the directory name / views.
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES | We don't need to bring in proces.env in here because it only needs to be put in once in the node application.
// this is for serving static files (for example to show the html template). express.static is a built in method. In it we put the directory from which we want to serve files. With this, we can open the url: 127.0.0.1:3000/overview.html. No need for public folder because it will automatically look there
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers. Good practice to set this early on in the application so we're sure it's set and safe
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message:
		'Too many requests from this IP address, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body.  We can specify the limit of data that comes in, through the options. We can also leave it empty
app.use(express.json({ limit: '10kb' }));
// We need this middleware to parse data, coming from a form. It's called this way because the way the form sends data to the server is also called url encoded. Here we need this middleware to parse data coming from the urlencoded form. What's inside are settings. Extended: true allows us to send more complex data, which is not neccecary in this case but we still do it! So one use case of this is the form on the user page where they can update their information. Initially, fill the fields with the data that come from the user. But after saving it, we want to display the data that came from the form. Lesson 194. We have this in order to make exports.updateUserData in viewscontroller work properly.
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanatization against noSQL query injection. Best place after bodyparser since this is just after the data got read into the req.body. For this we use the package express-mongo-sanitize. It looks at the request body, the querystring, and also at req.params and then it will filter out all dollar signs and dots. Then the mongodb operators will not work anymore.
app.use(mongoSanitize());

// data sanitization against xss. Package xss-clean. This will clean any user input from malicious html code. Imagine a hacker injection some javascript code into your html code to wreck some havoc! Mongo validation should also protect for a large part
app.use(xss());

// Prevent parameter pollution | Important to put it at the end because it clears up the querystring
app.use(
	hpp({
		// in some cases we want to have duplicate fields (like duration between 4 and 9) In that case we can whitelist an array of properties of which we allow duplcates
		whitelist: [
			'duration',
			'ratingsQuantity',
			'ratingsAverage',
			'maxGroupSize',
			'difficulty',
			'price'
		]
	})
);

// will compress text that's send to the user
app.use(compression());

// Test middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	// console.log(req.cookies);
	next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// For handling errors Operational error We're putting the error handler here, so the application got all the chances to search for the right router. We could also use app.get/delete/put etc.. here, but that would be unnecessary extra work. The star '*' stands for everything. 404 = not found
app.all('*', (req, res, next) => {
	// Here we're defining the statusCode and the status on the error object. We're creating an error, and then define the status and statuscode on it, so that our error handling middleware, can then use them in the next step. Whenever an argument is passed into next, express wil then know it's an error, no matter what is passed in. 'err', calls 'err', which is the argument of the error handling middleware | no matter what error, AppError will be called globally
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
