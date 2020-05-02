// const fs = require('fs');
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// For uploading multiple tour images
const multerStorage = multer.memoryStorage();

// Goal is to test if the uploaded file is an image. We don't want other type of files (like virusses)
const multerFilter = (req, file, cb) => {
	// if it's an image, mimetype will always start with image/. startsWith is a JavaScript method.
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError('Not an image! Please upload only images.', 400), false);
	}
};

// We also could've put the filter and storage in this variable, but Jonas says this looks cleaner.
const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter
});

// Multer will know with fields you're possibly going to upload multiple images
exports.uploadTourImages = upload.fields([
	// So we can only have one image cover
	{ name: 'imageCover', maxCount: 1 },
	{ name: 'images', maxCount: 3 }
]);
// in case we didn't have the image cover but just a field with multiple images, we could've done it like this
// upload.array('images', 5) // and if we only upload one it's upload.single('image')

// Don't forget: Every (req, res, next) is a middleware, which needs to return next() to proceed to the next action/function/middleware etc...
exports.resizeTourImages = catchAsync(async (req, res, next) => {
	if (!req.files.imageCover || !req.files.images) return next();

	// 1) Cover image. Image cover is an array (with a lot of numbers). To choose the image cover we'll have to use the first array. It's important to put the info in the req.body, in order for the next middleware to update the info.
	req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
	await sharp(req.files.imageCover[0].buffer)
		.resize(2000, 1333)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/tours/${req.body.imageCover}`);

	// 2) Images. Look at req.body.images.push(filename);. So the tour images AND the tour cover image get put in the req.body
	req.body.images = [];

	// Promising all because normal async await won't work properly thanks to the foreach map loop. Because, the async await will not work when it's inside of the callback function. It will not stop the code from moving to next() before we mapped everything. That's why we're awaiting the Promise of all the things we're mapping with the for each loop. Using map allows us to save an array of all the promises. This allows us to use Promise.all. If we wouldn't do this, the code wouldn't work
	await Promise.all(
		// in our callback function we get access to the current index, which stands for 'i'. Because the index starts at '0', and we want the images to start from one, we're adding a + 1
		req.files.images.map(async (file, i) => {
			const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

			await sharp(file.buffer)
				.resize(2000, 1333)
				.toFormat('jpeg')
				.jpeg({ quality: 90 })
				.toFile(`public/img/tours/${filename}`);

			// We now need the filename because we need to push this filename into request.body.images
			req.body.images.push(filename);
		})
	);

	next();
});

// Middleware
exports.aliasTopTours = (req, res, next) => {
	// everything in here is a string, so I'm putting the number in as a string
	req.query.limit = '5';
	req.query.sort = '-ratingsAverage,price';
	req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
	next();
};

// Features also still work!!
exports.getAllTours = factory.getAll(Tour);
// we could also use 'select' as the third argument
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
// 	// first argument takes in what you to change, second argument takes in what you want to respond, third argument takes in options
// 	const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
// 		// documentation mongoose about new: new: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
// 		new: true,
// 		// we run the validators for the second time to check again if the updated information confirms to the rules we set (is it a string/number etc..). If we didn't have this, the validator wouldn't run (for example with name check)
// 		runValidators: true
// 	});

// 	if (!tour) {
// 		return next(new AppError('No tour found with that id', 404));
// 	}

// 	res.status(200).json({
// 		status: 'success',
// 		data: {
// 			// second way of sending back tour. The tour property is set to the tour object. You don't have to use this when the property has the same name as the value
// 			tour: tour
// 		}
// 	});
// });

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async (req, res, next) => {
// 	// in this case it's important we save the tour to the variable in order to push the error to the client
// 	const tour = await Tour.findByIdAndDelete(req.params.id);

// 	if (!tour) {
// 		return next(new AppError('No tour found with that id', 404));
// 	}
// 	// a 204 status will HIDE any message.
// 	res.status(204).json({
// 		status: 'success',
// 		data: null
// 	});
// });

// For aggregation pipeline. Which is a mongodb feature, which is available because of Mongoose. Aggregation allows us to manipulate the data from mongodb
exports.getTourStats = catchAsync(async (req, res, next) => {
	// aggregate is like a normal query. But, aggregation us to manipulate the data in a couple of different steps. We define the steps as arguments within aggregate as arrays, which are called stages. The documents then go through every stage
	const stats = await Tour.aggregate([
		// match is to select or filter certain documents. $gte = greater or equal than. We could exclude the secret tours here. But we'll define the middleware in the tourModel. Otherwise, we would have to add the middleware at multpiple places
		{
			$match: { ratingsAverage: { $gte: 4.5 } }
		},
		{
			// Allows us to group documents together, using acumulators. For example calculate the average rating of a tour. For now we do null with id so we can look at all the different groups. avg stands for average. $avg is a mongodb operator
			$group: {
				// we can also group the results for different fields, using the dollarsign and the name of the field. For example: _id: '$difficulty'
				_id: { $toUpper: '$difficulty' },
				// for every document that's added, 1 will be added to the num counter
				numTours: { $sum: 1 },
				numRatings: { $sum: '$ratingsQuantity' },
				avgRating: { $avg: '$ratingsAverage' },
				avgPrice: { $avg: '$price' },
				minPrice: { $min: '$price' },
				maxPrice: { $max: '$price' }
			}
		},
		{
			// We sort with the results from the first stage. So if we sort with average price, we do that with avgPrice. we use 1 for ascending, -1 for descending
			$sort: { avgPrice: -1 }
		}
		// This is for just showing we can also repeat stages. Remember that we set it to difficulty. $ne = not equal to. It excludes
		// {
		// 	$match: { _id: { $ne: 'EASY' } }
		// }
	]);
	res.status(200).json({
		status: 'success',
		data: {
			stats
		}
	});
});

// this is a function to calculate the busiest month of the current year, by calculating how many tours start in the given year

// Adding next because of catchAsync function, for error handler middleware
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
	const year = req.params.year * 1; // 2021

	const plan = await Tour.aggregate([
		{
			// unwind is going to deconstruct an arrayfield from the input documents and then output one document for each element of the array. So in this instance, one tour for each of the states in the array. One tour starts more often, and is initially linked to the id of the tour itself. With unwind, we detach the dates from the tour, putting them into their own object. This makes them countable. Were we first have just a couple of objects, now we have a lot more.
			$unwind: '$startDates' // stage 1
		},
		{
			$match: {
				// stage 2
				startDates: {
					// mongo can easily handle dates/date comparisons. gte= greater then. lte= less then. We want it to be between the first and last day of the year
					$gte: new Date(`${year}-01-01`),
					$lte: new Date(`${year}-12-01`)
				}
			}
		},
		{
			$group: {
				// stage 3
				// $month Returns the month of a date as a number between 1 and 12. See mongodb docs. $sum: 1 will add one to the variable for every tour
				_id: { $month: '$startDates' },
				numTourStarts: { $sum: 1 },
				// tours is an array. How else would we specify different tours in one field. Reminder: $name is the name of the tour
				tours: { $push: '$name' }
			}
		},
		{
			// we're doing this so we can add the name of the month, and afterwards hide the id
			$addFields: { month: '$_id' } // stage 4
		},
		{
			$project: {
				// we're doing this so _id won't show
				_id: 0
			}
		},
		{
			// Starting with the highest number
			$sort: { numTourStarts: -1 }
		},
		{
			$limit: 12
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			plan
		}
	});
});

// /tours-within/:distance/center/:latlng/unit/:unit. 34°07'30.4"N 118°07'27.9
// /tours-within/:distance/center/34.11145,-118.113491/unit/km

exports.getToursWithin = catchAsync(async (req, res, next) => {
	//destructuring
	const { distance, latlng, unit } = req.params;
	// using destructuring again
	const [lat, lng] = latlng.split(',');

	// 3963.2 is the radius of the eart. We're using this to devide it into miles. Otherwise, we'll assume that it's km. We have to do this like this because MongoDB expects us to put the radius within 'radius'/
	const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

	if (!lat || !lng) {
		next(
			new AppError(
				'please provide latitude and longitude in the format lat, lang.'
			),
			400
		);
	}

	// we want to query the start location. Geowithin is a geo operator. $centerSphere takes in a center coordinate and a radius. Always define the lng first
	const tours = await Tour.find({
		startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
	});

	res.status(200).json({
		status: 'success',
		results: tours.length,
		data: {
			data: tours
		}
	});
});

exports.getDistances = catchAsync(async (req, res, next) => {
	const { latlng, unit } = req.params;
	const [lat, lng] = latlng.split(',');

	const multiplier = unit === 'mi' ? 0.000621371 : 0.001; // multiplyer for converting km to miles, or ':', to meters. 0.001 is the same as dividing by 1000

	if (!lat || !lng) {
		next(
			new AppError(
				'please provide latitude and longitude in the format lat, lang.'
			),
			400
		);
	}

	// You always aggregate on the Model itself
	const distances = await Tour.aggregate([
		{
			// For geospatial aggregation, there is only one stage, which is called GeoNear. It ALWAYS needs to be the first in the pipeline. GeoNear requires that at least one of our fields contains a geospatial index (which in this case we created in the tourModel (startLocation: '2dsphere')). Even though we're putting it at the first place here, it won't work if we have an aggregation middleare that fires off before this function. Right now we're blocking out the middleware code. But if you want to use this in a real life app, you could make an if statement that says to not run the code when the geoNear code runs.
			$geoNear: {
				// 'near' is the point from which to calculate the distances. So the distances will be calculated between the point we define in near and then all the startlocations
				near: {
					// GeoJson
					type: 'Point',
					// multiplying them with numbers to convert them into a number
					coordinates: [lng * 1, lat * 1]
				},
				// This is where all the calculated distances will be stored
				distanceField: 'distance',
				// for converting meters to km
				distanceMultiplier: multiplier
			}
		},
		{
			// For only showing the fields we need, without all the clutter of the unneccecary information.
			$project: {
				distance: 1,
				name: 1
			}
		}
	]);

	res.status(200).json({
		status: 'success',
		data: {
			data: distances
		}
	});
});
