// Usually you use a try catch block when you want to handle an error in an asyncronise function. This is not ideal when you have a lot of blocks, since it makes you write code more often then necessary. We can also put all the error function's in another function. Asynchronous functions give promises. When there is an error inside of an asynchronous function, that means that the promise get's rejected. We can catch that error in the function were we're calling the function. When we do this, we no longer need the try catch block to deal with the error.

// we're passing next into this function, so we can pass the error into it, so that the error can be handled by the global error handling middleware. 'fn' is the code down below | createTour should be a function, but not the result of calling a function | So in order to get rid of our trycatch blocks, we wrapped our asyncronous function inside of the catchAsync function. This function will then return a new anonymous function which is (req, res, next) => {	fn(req, res, next).catch((err) => next(err)); which will then be assigned to createTour. So that function will be called as soon as a new tour is created. When a tour is created,

module.exports = (fn) => {
	// this is the function that express is going to call when the client hits the route
	return (req, res, next) => {
		// this line is what allows us to get rid of the try catch block. first this was: (err => next(err)). next(only takes in an error). That's why even though we do not specifiy what's in next, express knows to push an error
		fn(req, res, next).catch(next);
	};
};

/*
So previously it was in the same tourController:

if we would leave it like this, then this function would call createTour to run it, but we don't want this. We want express to call it as soon as the client hits the route. In order to avoid this, we create another function within the function, which then will return createTour. fn, stands for the function that we're calling. You can see that it's in the second block. We save ourselves the hassle of having to write the catch block everytime we create a new crud. 
const catchAsync = fn => {
    fn(req, res, next).catch(err =>(next))
}

exports.createTour (async (req, res, next) => {
	const newTour = await Tour.create(req.body);

	res.status(201).json({
		status: 'success',
		data: {
			tour: newTour
		}
	});
});

So then how do we listen to the error? 

1. We listen to the server 
2. The server listens to app.js 
3. In app.js, we defined the global handling middleware(with will allways be called when we put something in next(). Express will know that it concerns an error), that will create a new object out of the AppError class
4. The app error class will use this., to look at the code that's being passed in, and will send a error message accordingly. The error message will be determined by statuscode. Which, if left blank by the Error controller or the error message we specifically set it to, in the function that transmits the error, will be set by next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404)); in app.js. This code is like a last resort. If the error was defined in the function that's called, that would've caught the error. But remember, if the error is operational, it will always be logged by the error controller. If the error controller doesn't know what to do with the error, it will run: 

const sendErrorProd = (err, res) => {
	// Operational, trusted error: send message to client
	if (err.isOperational) {
		res.status(err.statusCode).json({
			status: err.status,
			message: err.message
		});
		// Programing or other unknown error: don't leak error details
	} else {
		// 1. log error. We could use error libraries for this.
		console.error('Error', err);
		// 2. send generic message
		res.status(500).json({
			status: 'error',
			message: 'Something went very wrong'
		});
	}
};


So let's deconstruct it:

We know that route handlers/middleware in Express need to take in a function and that function gets called with the (req, res, next) arguments and we want to make it async, so we can do:

app.get('/myroute', async (req, res, next) => {
    ...
})
So that works and I can do this for every route. However, now I'll have to handle each error inside of the async function using try/catch everywhere and I'll have to do that for every route. How can I clean this up? Well since async functions return Promises, I know I can add a .catch() block to it, but I need to be able to pass next to the catch block. The only way to do that is with closures:

const myFunc = async (req, res, next) => {
    ...
})
 
app.get('/myroute', (req, res, next) => {
    myFunc(req, res, next).catch(next)
})
Now when an error occurs, our .catch() block will catch it and call next() with the error. The next problem is that I need to generalize this so I can pass in any function I want so we wrap it in yet another function:

const catchAsync = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(next)
    }
}
*/
