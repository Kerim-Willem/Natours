// const fs = require('fs');
const Tour = require('../../models/tourModel');

// Middleware
exports.aliasTopTours = (req, res, next) => {
	// everything in here is a string, so I'm putting the number in as a string
	req.query.limit = '5';
	req.query.sort = '-ratingsAverage,price';
	req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
	next();
};

exports.getAllTours = async (req, res) => {
	try {
		// 1A. Filtering | BUILD QUERY | Shallow copy of the req.query object. with this const, we need to hardcode data into it/hardcopy. Because then if you would delete something from the const queryObj object, you would also delete it from the req.query object. That's because in JavaScript when we set a variable to another object, then that new variable will be a reference to that original object. There's not a built in way to do this, therefore we use destructuring -> the spread operator. Then we can just create a new object out of it. The spread operator will take all the fields out of the object. With the curly braces we create a new object. Now we have a new object that is going to contain all the key value pairs that are in req.query
		const queryObj = { ...req.query };
		// So the reason why we're doing this, is because with the find() we're sorting, based on the parameters that are in the url. If we want to do pagination for example, and have the page number in our url, find() will include it, and break our code in the process. That's why we exclude it.
		const excludedFields = ['page', 'sort', 'limit', 'fields'];
		excludedFields.forEach((el) => delete queryObj[el]);
		// Advanced filtering 1B | greater than/equal, etc... | There are Mongoose methods that allow you to filter and sort through the objects. You can specify them within the parameters. For example [gte] for greater then. But when you run this, you'll get an error, and when you console.log it, you'll get back an object. For example: {difficulty: 'easy', duration: {gte:'5'}}. But in order for us to call the mongoose method, we have to call {difficulty: 'easy', duration: {$gte:5}} . So in order to call the mongoose operators, we'll have to replace gte (or any other operators) with $gte. First we need to convert it into a string, to make it summonable by mongoose.
		let queryStr = JSON.stringify(queryObj);
		// regular expressions: \b is to target the specific object, because we only want to match the exact words that we're targeting. g is so it happens multiple times. If we didn't have g, it would only change the first occurrence. So if there are multiple operators that run at the same time, they will get replaced too. We want to replace gte = greater than or equal, gt = greater than, lte = less than or equal, lt = less than. the | operator stands for 'or'. The regular expression takes in a callback function. In this case the callback replaces the old string with the new string. Here we're using template strings to specify the match, and we're putting a dollar sign in front of it so it becomes a mongoose method. For the console.log: JSON.parse makes it into an object. We're basically reversing the process, including the $ sign. We're using let, because we want to save the new query string within the same const. If you define a variable twice within the same scope, use let. The replace function only works with strings!!
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

		// When we leave find() empty, it will return all the documents within the Tour collection. .find() will also automatically convert the results into javascript. if we don't save the query that's the result of this await, we won't be able to sort it later. So: Get all tours makes an async call, creating a const = queryObj, that creates a new object out of the query, using the spread operator to take in all the variables of the requested query. Afterwards, we exclude fields from that object, using excludedFields. We do this, so our sorting/pagination doesn't get messed up. Using the for each loop, we're iterating over all the values in queryObj, deleting the ones we defined in exludedFields. Afterwards we're stringifying the object, so we'll be able to put the $ in front of it, making us able to call the former object as a mongoose method. We also want to make sure we don't include other operators, such as gte|gt etc... That's why we use a regular expression in this case. If we would use this in a real life scenario, we'll have to make a documentation for the api, so the frontend developer knows what we're building
		let query = Tour.find(JSON.parse(queryStr));

		// 2. Sorting | Here we changed const query ^ to let query, because we're changed the query here, based on how it's sorted. .sort is a mongoose method. Let's say that we're sorting on the price. Mongoose then knows it can sort, based on the value that sort holds. So if this is in the parameters: sort=price, Mongoose will sort, based on the value that sits inside price. Leaving it like this, mongoose will sort in a ascending order. If you want to let it move in a descending order, you have to call for example 'sort=-price', instead of 'sort=price'. If you want to have an additional sort(for example when the price is the same, just do: sort=prize,ratingsAverage ). Therefore we take the parameter that comes from req.query.sort, we split them with ',', and them we rejoin the elements to an array using the ' '. The client url gets translated into an array like this.
		if (req.query.sort) {
			const sortBy = req.query.sort.split(',').join(' ');
			query = query.sort(sortBy);
		} else {
			// for when there's no sort, this will be our default. Minus stands for ascending sort
			query = query.sort('-createdAt');
		}

		// 3. Field limiting | To reduce bandwidth, and to only show the relevant information to the client. url example: 127.0.0.1:3000/api/v1/tours?fields=name,duration,price. Just like before, Mongoose requests a string with the field name, separated by spaces. query = query.select('name duration price'). With this we're selecting only certain field names, which is called projecting. Mongoose almost always uses _v. It's not a good practice to remove them, but we can hide them. Therefore we're doing this in the default. We do this with query.select('-__v'). With select, the minus stands for excluding
		if (req.query.fields) {
			const fields = req.query.fields.split(',').join(' ');
			query = query.select(fields);
		} else {
			query = query.select('-__v');
		}

		// 4. Pagination | By default we're defining a page 1 and a limit of 100, so when a user requests all of the tours, he'll only see 100 tours. We're doing req.query.page * 1(it's a trick), to convert the string into a number. Then by default, we want page 1. We do this with || 1. Skipping: If we're (for example) requesting page 3, with the limit of 10, the results start at 21 and end at 30. Therefore we need to skip 20 results, to come at page 3. page - 1. You can also convert to number using unary operator: const limit = +req.query.limit || 1;
		const page = req.query.page * 1 || 1;
		const limit = req.query.limit * 1 || 10;
		const skip = (page - 1) * limit;

		query = query.skip(skip).limit(limit);

		if (req.query.page) {
			// For if the user requests for example page 4 when there are only 3. countDocuments is a Mongoose method that returns a promise(the amount of documents). We're throwing an error here in the try block(where we're still in), it will automatically move to the catch block, throwing the 404 error. In the real application, we're not using this because having no pages left, isn't really an error. Nothing went wrong
			const numTours = await Tour.countDocuments();
			if (skip >= numTours) throw new Error('This page does not exist');
		}

		// EXECUTE QUERY
		const tours = await query;

		// SEND RESPONSE
		res.status(200).json({
			status: 'success',
			results: tours.length,
			data: {
				tours
			}
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err
		});
	}
};

exports.getTour = async (req, res) => {
	try {
		// don't forget; the parameter is in the link, and we defined 'id' in the route. So we're (req)uesting the parameter id. findById is a mongoose method
		const tour = await Tour.findById(req.params.id);
		// you could also do: Tour.findOne({_id: req.params.id}). Mongo creates the id with an underscore

		res.status(200).json({
			status: 'success',
			data: {
				// first way of sending back tour
				tour
			}
		});
	} catch (err) {
		res.status(404).json({
			status: 'fail',
			message: err
		});
	}
};

exports.createTour = async (req, res) => {
	try {
		// We can also create a tour like this:
		// const newTour was created from the Tour model, which then get's access to the save method, because that is part of the prototype object of the Tour class. If You can't save Tour, which is the prototype. But you can save the object (newTour) that is created by the prototype
		// const newTour = new Tour({});
		// newTour.save();

		const newTour = await Tour.create(req.body);

		res.status(201).json({
			status: 'success',
			data: {
				tour: newTour
			}
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: err
		});
	}
};

exports.updateTour = async (req, res) => {
	try {
		// first argument takes in what you to change, second argument takes in what you want to respond, third argument takes in options
		const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
			// documentation mongoose about new: new: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
			new: true,
			// we run the validators for the second time to check again if the updated information confirms to the rules we set (is it a string/number etc..)
			runValidators: true
		});

		res.status(200).json({
			status: 'success',
			data: {
				// second way of sending back tour. The tour property is set to the tour object. You don't have to use this when the property has the same name as the value
				tour: tour
			}
		});
	} catch (error) {
		res.status(400).json({
			status: 'fail',
			message: 'Invalid data send'
		});
	}
};

exports.deleteTour = async (req, res) => {
	try {
		await Tour.findByIdAndDelete(req.params.id);

		// a 204 status will HIDE any message.
		res.status(204).json({
			status: 'success',
			data: null
		});
	} catch (err) {
		res.status(400).json({
			status: 'fail',
			message: 'Invalid data send'
		});
	}
};
