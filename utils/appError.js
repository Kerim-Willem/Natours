// Error is a built in class. We're using this class for every error in our application
class AppError extends Error {
	constructor(message, statusCode) {
		// With super we call the parent class. Message is the only argument the parent class 'Error' accepts. We don't have to 'this' this, because it refers to the message property of the predefined parent class Error. The message takes in the incoming message of our error
		super(message);

		this.statusCode = statusCode;
		// remember: status can be either fail or error. We could pass that into the object, but that isn't neccecary, because the status depends on the statusCode. So if the statusCode is a 400, then it's a fail, and if it's a 500, it's an error. In JavaScript, there's a starts with method that we can call on strings. With this method, we save the time to pass in fail and error. ? = then do ..., : = otherwise do...
		this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
		// We're doing this so we can test for this property and only send error messages back to the client for these operational errors we created in this class. This is usefull because some other errors that might happen (programming error or a bug), will then not have this operational property on them. It makes it easier to filter out where the problem comes from | All the errors we set ourselves will be operational errors. We only want to send these to the client
		this.isOperational = true;
		// capturing stack trace. .stack/ .captureStackTrace will show us where the error happens. The first this. specifies the current object. The this.constructor specifies the app 'Error' class itself. This way when a new object is created and the constructor function is called, then that function call is not going to appear in the stack trace and will not polute it.
		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = AppError;
