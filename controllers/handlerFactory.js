// Factory function: A function that returns another function. Since we're making a lot of requests, updating the type of response we're giving is going to be time consuming and making us write code more then once for the same thing. We're creating the handler in this map because we're creating handlers for the controllers.
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

// This function is not only going to work for deleting tours, but also to delete reviews and users, and ofcourse some other future documents we have. See that we're putting a function (catchAsync) within a function (model)
exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc) {
			return next(new AppError('No document found with that id', 404));
		}
		res.status(204).json({
			status: 'success',
			data: null
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		// first argument takes in what you to change, second argument takes in what you want to respond, third argument takes in options
		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			// documentation mongoose about new: new: bool - if true, return the modified document rather than the original. defaults to false (changed in 4.0)
			new: true,
			// we run the validators for the second time to check again if the updated information confirms to the rules we set (is it a string/number etc..). If we didn't have this, the validator wouldn't run (for example with name check)
			runValidators: true
		});

		if (!doc) {
			return next(new AppError('No document found with that id', 404));
		}

		res.status(200).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const doc = await Model.create(req.body);

		res.status(201).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});

// popOptions = for .populate. Created this function in tourcontroller before
exports.getOne = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		// We didn't have this in the tourcontroller version
		let query = Model.findById(req.params.id);
		if (popOptions) query = query.populate(popOptions);
		const doc = await query;
		// don't forget; the parameter is in the link, and we defined 'id' in the route. So we're (req)uesting the parameter id. findById is a mongoose method | WE"RE USING POPULATE HERE, but first as a middleware. See middleware tourSchema.pre in tourModel for more info about populate. Creating it there so we don't have to write the same code twice | Using populate again, but now for the virtual fields for showing reviews. Only doing it here because we only want to show the reviews when the client is getting one tour. This is how it was in tourcontroller:
		// const doc = await Model.findById(req.params.id).populate('reviews');
		// you could also do: Tour.findOne({_id: req.params.id}). Mongo creates the id with an underscore

		// this works because having no tour means a null, which in JavaScript is a false value that will convert to false in a if statement.
		if (!doc) {
			// we want to return it, otherwise it goes onto the next line. Don't forget; next only accepts errors, so it will assume you're throwing an error
			return next(new AppError('No tour found with that id', 404));
		}

		res.status(200).json({
			status: 'success',
			data: {
				data: doc
			}
		});
	});

exports.getAll = (Model) =>
	catchAsync(async (req, res, next) => {
		//To allow for nested GET reviews on tour. Jonas says that implementing this in another way would be a heckle, so that's why we're doing it here. At first these functions were inside of reviewcontroller. Is there a tour id(so if req.params.tourId isn't empty)? Then we're only getting the reviews from that specific tour. Let filter because we want to mutate filter.
		let filter = {};
		if (req.params.tourId) filter = { tour: req.params.tourId };

		// EXECUTE QUERY. | Don't forget to look at app.all for global error handling | So we call the features whenever we call Tour.find(). Now, we have access to the methods within the class. Now we can call filter(). Because query doesn't exist anymore, we call features.query. (Tour.find(), req.query) creates an object that we can filter through. However, the filter method won't return anything. That is why we return the filter in the class. So to recap what happens here: We are creating a new object of the APIFeatures class. In there, we are a queryobject and the querystring that's coming from express. By adding the methods, we manipulate the query. Then we await the result so it can come back with all the documents that were selected, which lives in features, and is called by tours = features.query | We're not sending an error when the user can't get any tours, since it's not really an error. | FILTER IN FIND IS ONLY FOR REVIEWS
		const features = new APIFeatures(Model.find(filter), req.query)
			.filter()
			.sort()
			.limitFields()
			.paginate();
		// if we put .explain() after features.query, and call the api, then we'll get a list of stats about the query
		const doc = await features.query;

		// SEND RESPONSE
		res.status(200).json({
			status: 'success',
			results: doc.length,
			data: {
				data: doc
			}
		});
	});
