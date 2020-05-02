// It's a good practice to put everything related to the server in a server file, and everything else(like express etc..) in a seperate file (app.js)
/*
In node.js, we can use environment variables. We use these, to set up different environments in our application, such as development and production. Express automatically sets the enviroment variable to development. Because the variables are not from express, we declare them outside of the express files. (env) enviroment variables are global variables that are used to define the enviroment in which a node enviroment is running. Node sets a lot of environment variables.  You can look at them at process.env. They come from the process core module

If we want to prepend the server to a specific build, we can do that in the terminal. For example: NODE_ENV=development (what's in package.json scripts) nodemon server.js. We can define more, by just adding it with a space. For example: NODE_ENV=development X=23 nodemon server.js. Ofcourse, we can also add it in the configuration file (config.env). It's also a convention to use uppercase for env. variables. For

The convention to connect the .env file to the node app, is to use the npm package 'dotenv'
*/
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Uncaught exceptions: All errors/bugs that occur in asyncronous code that are not handled anywhere. This should be ran in the beginning of the code!
process.on('uncaughtException', (err) => {
	console.log('Uncaught exeption. Shutting down...');
	console.log(err.name, err.message);
	// with an uncaught exeption, we really need to crash the server. Otherwise, node will remain in an 'unclean state'. Therefore it needs to be restarted. Most hostingservices do this out of the box
	process.exit(1);
	// for example for if log console.log(x), without declaring it
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
	'<PASSWORD>',
	process.env.DATABASE_PASSWORD
);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: false,
		useUnifiedTopology: true
	})
	.then(() => {
		console.log('DB connection successful');
	});

// this will show the environment that we're currently in(development)
// console.log(app.get('env'));
// console.log(process.env); this will show everything that's in process.env

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
	console.log(`App Running on port ${port}...`);
});

// The errors should be handled right where the problem occurs. This a last resort/safetynet
// Code for handling global promise rejections. This is going to help us determine where the bug comes from. Good practice as last safetynet
process.on('unhandledRejection', (err) => {
	console.log('Unhandled Rejection. Shutting down...');
	console.log(err.name, err.message);
	// if there's a problem with for example the database connection, the only thing we can do is to shut down the program. .exit accepts: 0 = success, and 1 for uncalled acception. .exit is very abrupt, that's why it's not good to use it in most cases. To 'gracefully' shut down the server, we wrap the server into a variable. In this case const server, do: server.close, and afterwards we do process.exit. This will give us time to let the server finish it's requests. In real life projects, there are some tools in place to restart the application right after it crashes. Some platforms do this on their own.
	server.close(() => {
		process.exit(1);
	});
});

process.on('SIGTERM', () => {
	console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
	server.close(() => {
		console.log('💥 Process terminated!');
	});
});
