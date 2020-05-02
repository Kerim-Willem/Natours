const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
	'<PASSWORD>',
	process.env.DATABASE_PASSWORD
);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useFindAndModify: true,
		useUnifiedTopology: true
	})
	.then(() => {
		console.log('DB connection successful');
	});

// READ JSON FILE
// const tours = JSON.parse(fs.readFileSync('./tours-simple.json', 'utf-8')); Will not work
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
	fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);

// IMPORT DATA INTO DB | If we run it without turning of the validators, we're going to get an error . Just for running this script, we've temporarly disabled the validator middleware in userModel.js (the pre.save)
const importData = async () => {
	try {
		await Tour.create(tours);
		await User.create(users, { validateBeforeSave: false });
		await Review.create(reviews);
		console.log('Data successfully loaded');
	} catch (err) {
		console.log(err);
	}
	process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
	try {
		// deleteMany, if left empty, deletes all the data within the selected collection
		await Tour.deleteMany();
		await User.deleteMany();
		await Review.deleteMany();
		console.log('Data successfully deleted');
	} catch (err) {
		console.log(err);
	}
	// exit is aggresive. Not suitable to use in large projects
	process.exit();
};

// For running the function within the commandline. node dev-data/data/import-dev-data.js --import
if (process.argv[2] === '--import') {
	importData();
} else if (process.argv[2] === '--delete') {
	deleteData();
}
