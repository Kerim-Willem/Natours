// const fs = require('fs');
const Tour = require('../../models/tourModel');

// This function is for manually calling the data
// const tours = JSON.parse(
// 	fs.readFileSync(`{__dirname}/../dev-data/data/tours-simple.json`)
// );

// This is Middleware we don't longer need
// exports.checkID = (req, res, next, val) => {
// 	console.log(`Tour id is: ${val}`);
// 	if (req.params.id * 1 > tours.length) {
// 		// it's important we use return here. If we didn't, express wouldn't stop running this code. We would get the same error as earlier: cannot send header
// 		return res.status(404).json({
// 			status: 'fail',
// 			message: 'invalid id'
// 		});
// 	}
// 	next();
// };

exports.checkBody = (req, res, next) => {
	if (!req.body.name || !req.body.price) {
		return res.status(400).json({
			status: 'fail',
			message: 'There is no name and price in the tour!'
		});
	}

	next();
};

exports.getAllTours = (req, res) => {
	console.log(req.requestTime);
	// doesn't matter what kind of request we're putting out, we always need a 'res'pons cycle. After res.status, the event cycle will be finished. Therefore you always need to call Middleware beforehand
	res.status(200).json({
		status: 'success',
		requestedAt: req.requestTime
		// with tours.length we send the amounts of javascript objects within the parsed array
		// results: tours.length,
		// data: {
		// 	// if const tours was toursX, then: tours: toursX. Because of es6, you could just say tours, but for simplicities sake, I'm leaving it
		// 	tours
		// }
	});
};

exports.getTour = (req, res) => {
	// for dynamic variables, you can use /:(whatever you like)id/:x/:y. If you want to make some optional, you use '?'
	// req.params is where all variables that we define here are stored(in this case :id, which can be anything by the way!). console = {id: '5'}
	console.log(req.params);

	// const tours will not work without const id. tours will look for a number, but the id is currently a string. with const id we convert it. * 1 is a trick that automatically convert the string to a number
	const id = req.params.id * 1;
	// find is a javascript method. It takes in a callback function, and will create a variable for every instance where === is true. This way we make sure that only the id that's in the request body, will be stored as tour
	// const tour = tours.find((el) => el.id === id);

	// res.status(200).json({
	// 	status: 'success',
	// 	data: {
	// 		tour
	// 	}
	// });
};

exports.createTour = (req, res) => {
	// req holds all the information of the request that is done. If that request contains some data that was send, than obviously that data should be on the req. Out of the box, Express doesn't put that data in the req. For that, we use middleware. the .body is available to the request because of middleware
	// console.log(req.body);
	// const newId = tours[tours.length - 1].id + 1;
	// // Object.assign allows use to create an object by merging two objects together
	// const newTour = Object.assign({ id: newId }, req.body);

	// tours.push(newTour);
	// // we don't use writeFileSync because that would block the event loop, which is a big no no. We use writeFile that uses a callback function. And as soon as it's ready, it's gonna put it's event in one of the event loop ques, which is going to be handled as soon as the event loop passes that phase
	// fs.writeFile(
	// 	`${__dirname}/../dev-data/data/tours-simple.json`,
	// 	JSON.stringify(tours),
	// 	(err) => {

	res.status(201).json({
		status: 'succes'
		// 			data: {
		// 				tour: newTour
		// 			}
	});
	// 	}
	// );
};

exports.updateTour = (req, res) => {
	// // for updating tour // We don't have to use the error handler anymore, because of the param middleware checkID. We
	// if (req.params.id * 1 > tours.length) {
	// 	return res.status(404).json({
	// 		status: 'fail',
	// 		message: 'invalid id'
	// 	});
	// }
	res.status(200).json({
		status: 'success',
		data: {
			tour: '<Updated tour here>'
		}
	});
};

exports.deleteTour = (req, res) => {
	res.status(204).json({
		status: 'success',
		data: null
	});
};
