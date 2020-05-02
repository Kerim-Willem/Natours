//Mongodb supports geospatial data out of the box: Data that describes places on earth using longitude and latitude coordinates. We can describe simple points or complex geomatries like lines or even (multi)polygons
const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel'); // We only needed this for embedding the user into the tour document
// const validator = require('validator');

const tourSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			// second argument in required is an error. Required is also a validator
			required: [true, 'A tour must have a name'],
			unique: true,
			trim: true,
			maxLength: [40, 'A tour name must have less or equal than 40 characters'],
			minlength: [10, 'A tour name must have more or equal than 10 character']
			/* validate: [validator.isAlpha, 'Tour name must only contain characters'] */ // validator.isApha = method from validator package. Doesn't allow whitespace
		},
		slug: String,
		duration: {
			type: Number,
			required: [true, 'A tour must have a duration']
		},
		maxGroupSize: {
			type: Number,
			required: [true, 'a tour must have a group size']
		},
		difficulty: {
			type: String,
			required: [true, 'A tour must have a difficulty'],
			// With enum(validator), we pass in an array of the values that are allowed. Works only for strings
			enum: {
				values: ['easy', 'medium', 'difficult'],
				message: 'Difficulty must be either easy, medium or difficult'
			}
		},
		// we're not putting a required at ratings because the ratings will be calculated somewhere else
		ratingsAverage: {
			type: Number,
			default: 4.5,
			// min and max also works for dates
			min: [1, 'Ratings must be above 1.0'],
			max: [5, 'Ratings must be below 5.0'],
			// A callback function to round the average. For example: 4,67777 to 4,7. Just math.round turns numbers into integers(whole numbers, like 5). That's why we multiply it with 10, and devide it by ten to circumvent it.
			set: (val) => Math.round(val * 10) / 10
		},
		ratingsQuantity: {
			type: Number,
			// default zero because no tour that was just made can have a single review
			default: 0
		},
		price: {
			type: Number,
			required: [true, 'A tour must have a price']
		},
		// In some cases, the built in validators aren't enough. In that case you can build your own. For example, to check if the priceDiscount isn't higher then the price itself. In this case we're using validate, which takes in a callback function. Remember: a normal function in order to use the 'this.' variable. This callback function has access to the value that was inputted, in this case the priceDiscount the user specified (val). Own made validators accept true or false. You could also download packages for custom validators, so you won't have to write it yourself. The most popular library is called 'validator'
		priceDiscount: {
			type: Number,
			validate: {
				validator: function (val) {
					// the this. keyword will only work when creating a new document, not on a document you'll update
					return val < this.price; // 100 < 200, then it returns true. 250 < 200, then it returns false/an error
				},
				// message also has access to the value. Is internal to mongoose (isn't javascript!)
				message: 'Discount price ({VALUE}) should be below the regular price'
			}
		},
		summary: {
			type: String,
			// trim only works for strings, which will remove all the whitespace in the beginning and end.
			trim: true,
			required: [true, 'A tour must have a description']
		},
		description: {
			type: String,
			trim: true
		},
		imageCover: {
			type: String,
			required: [true, 'A tour must have a cover image']
		},
		// We're doing this because we want to put the images in an array
		images: [String],
		// created at is a timestamp when a user creates a new tour
		createdAt: {
			type: Date,
			default: Date.now(),
			// We're doing this so it doesn't show on the client side
			select: false
		},
		// MongoDB will automatically parse this into a javascript date
		startDates: [Date],
		secretTour: {
			type: Boolean,
			default: false
		},
		// MongoDB uses a special dataformat called GeoJSON in order to specify geo data | The object from startlocation is not for the schemaType options as we have it with the other declarations (like StartDates, createdAt etc...). This object(startlocation) is an embedded object
		startLocation: {
			// this is how mongo knows it's GeoJSON
			type: {
				// for creating embedded objects, we're specifying type again
				type: String,
				// This is how we specify a geometry. The default is point, but it could also be polygons/lines or other geometries
				default: 'Point',
				// making it the only option using enum
				enum: ['Point']
			},
			// Putting a number in an Array means that we expect an Array of numbers. This will be the coordinates. First is longitute. Second is latitude. This is how it works in GeoJson. In Google Maps it works the other way around.
			coordinates: [Number],
			address: String,
			description: String
			// So again, in order to specify GEOSpatial data with mongoDB, we need to create a new object. That object needs to have at least two objects (coordinates and types). We can then add more fields if we want.
		},
		// HOW TO CREATE AN EMBEDDED DOCUMENT For embedding all the locations in the tour document. The startlocation isn't a document itself. It's just an object describing a certain point on earth. In order to really create new documents and then embed them into another document, we need to create an array
		locations: [
			{
				type: {
					type: String,
					default: 'Point',
					enum: ['Point']
				},
				coordinates: [Number],
				address: String,
				description: String,
				// The day when the tour starts
				day: Number
			}
		],
		// EMBEDDING. We would use guides: Array Here's we're going to embed user's into the document. So how that would look for example: "guides": [21093809126sdkasdj, 890721378543, etc...] Look how we're not putting it into brackets! Then behind the scenes we would fetch the users that correspond with that id. We best way to do this is via e pre.save middleware | (Child) REFERENCING. Using an array will create a sub document/embedded document. Doing it this way, it would still look the same in postman ("guides": [21093809126sdkasdj, 890721378543, etc...]), but, when the tour document is shown, you won't see the data of the embedded users in the tour object, rather just the id's of the users/guides. In order to actually see the the user's data in the query, we'll have to populate it when calling the request object in tourController.
		guides: [
			// mongoose.Schema.objectId = for when we expect the type of each of the elements in the 'guides' array to be a mongodb id
			{
				type: mongoose.Schema.ObjectId,
				// this how we establish reference between different datasets in mongoose. For this to work we don't even need the User to be imported into this document
				ref: 'User'
			}
		]
	},
	{
		// If the data gets converted to json or an object, show the virtuals
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

// virtual properties are fields we can define on our schema but that will not be saved in the database, in order to save space. It can be usefull for fields that can be derived from one and another. For example a conversion from miles to kilometers. It doesn't make sense to save both if we can convert one to the other. The virtual property will be created each time we GET some data out of the database. This .get is called a getter. It takes in a callback function. We need to exclicitely call the virtual properties in our model, otherwise they won't show. We can't use the virtual property in a query, because they're technically not part of the database
tourSchema.virtual('durationWeeks').get(function () {
	// 7 stand for days. This is how we calculate the weeks. We used a regular function because an arrowfunction does not get its own 'this' keyword. But in here we actually need the this. keyword because this. is going to be pointing at the current document. So when you use this., use a regular function
	return this.duration / 7;
});

// Indexes. Whenever we call for example get sorted tours, the database will show a couple of results, but scan a lot of documents. When working with large applications, this can make your website a whole lot slower. We can command the database to create indexes of certain pieces of information, to reduce the amount of docs our application has to search for in order to give us the desired results. In this case we're indexing the price, since that's something a lot of people see as valuable information. 1 means we're sorting the price in a ascending order, -1 in a descending. There are alsoother indexes, like for text or geospatial data. We can also give the property Unique. When we specify in our user model that the property has to be unique, MongoDB will create an index out of the unique value. If we sometime with multiple fields, it's better to compound. We do this by ',' and then the other thing you want to index. We don't want to blindly set indexes to every field. Think about what get's queried in combination to each other and create your idexes out of that. That;s because an index takes up resources. Once you added an index, it's not enough to simply remove the code here. You'll have to delete it from the database.
// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
// Needs to be a 2d sphere index if the data describes real points on the earth like sphere. MongoDB knows 2dsphere.
tourSchema.index({ startLocation: '2dsphere' });

// Virtual property | For reviews on tours. Since we're parent referencing the tours from the reviews, there's no way we can see what kind of reviews are linked to the tours, from the tours. We could child reference, or even embed, but that would take up unneccary space. Instead, we're making a virtual property. The 'link' will then be created, but never stored in our database.
tourSchema.virtual('reviews', {
	// referring to the model
	ref: 'Review',
	// This is the name of the field in the other model (in this case review), where the reference to the current model(tour) is stored. It's what connects them
	foreignField: 'tour',
	// this _id, how it's called in the local model, is called tour in the foreign model(in the review model). It's like the identifyer
	localField: '_id'
});

// DOCUMENT MIDDLEWARE | Mongoose also has middleware. For example; Each time a document is saved to the database, we can run a function between the moment the save command is issued, and the actual saving, or after the saving. This is way it's called pre and post hooks. There are 4 types of middleware in mongoose: document, query, agregate and model middleware. .pre is for pre middleware, which will run before an actual event. Also with these middleware functions, you have to envoke next()
// Document Middleware: runs before .save() and .create(). (So no update!!) Doesn't work on .insertMany.
tourSchema.pre('save', function (next) {
	// this. is the currently processed document. lower will convert it to a lowercase
	this.slug = slugify(this.name, { lower: true, remove: /[*+~.()'"!:@]/g });
	next();
});

// EMBEDDED DOCUMENTS: Fetching users from id that's implemented in tour. This only works for new tours, not for updates. If we would want to update it, we'll have to write another function. We're not doing that in this case, because embedding the data in this way has a couple of drawbacks. For example: Imagine that a tourguide changes his role from assistent guide or lead guide, or changes his emailaddress. Each time one of these changes would happen, then you would have to check if that tour has that user as a guide and if so, update the tour as well.
// tourSchema.pre('save', async function (next) {
// 	// this is going to be an array of all the user id's. Doing this to get the user from each userid in the loop. We'll store it in guides. To do this, we're importing the User. Since we're asyncronously calling every id, it's going to return a lot of promises. Therefore we're awaiting them all, before going to next().
// 	const guidesPromises = this.guides.map(async (id) => await User.findById(id));
// 	this.guides = await Promise.all(guidesPromises);
// 	next();
// });

// // We can have multiple middleware for the same hook. 'Hook' is what we call the first parameter 'save' in this instance
// tourSchema.pre('save', function (next) {
// 	console.log('Will save document...');
// 	next();
// });

// tourSchema.post('save', function (doc, next) {
// 	// we have acces to the doc we just save through the first parameter
// 	console.log(doc);
// 	// Even if you have no next middleware, it's best practice to still include it
// 	next();
// });

// Query middleware. Only difference is the hook, which is 'find'. This makes it a query middleware. The 'this.' will now point to the query instead of the document. Let's say you want to have private/secret tours, for special users. We don't want them to be put in the result. Doing $ne = not equal, because we didn't set the others to false. The regular expression, which always happens within / /, means /^find/, for every commands that start with find. do this:. The reason why we do this, is because the id could still be called when you search it in the parameters. We want this method to work, not just for .find, but for findOneAndDelete, findOneAndUpdate etc... Remember, if you don't call next(), the code will get stuck
tourSchema.pre(/^find/, function (next) {
	// tourSchema.pre('find', function (next) {
	this.find({ secretTour: { $ne: true } });
	// make clock
	this.start = Date.now();
	next();
});

//  With populate we're going to replace the id's that are refferenced in the tour object, with the actual related data. So from just showing the id, we're showing the information that resides in the id. The result of that will look as if the data has always been embedded when in fact the data is in another collection. The populate process always happens in a query. When we're calling populate, we have to specify the field that we actually want to show. So remember that we only see the guides when we're hitting the getTour route. Not with getAllTours(only if we specifically tell it to do so). An option with the populate method, is to specify the fields you want to show from in this example 'guides'. To do this, we have to create an object and replace just 'guides', with what we have now. populate is a fundamental tool with working with mongoose. Behind the scenes using populate will still create new query, which can result is more loading time. With small applications it won't have a big effect, in large ones it does! Here's a link to an article about making your application faster. https://itnext.io/performance-tips-for-mongodb-mongoose-190732a5d382. It says you can better aggregate, then populate
tourSchema.pre(/^find/, function (next) {
	this.populate({
		path: 'guides',
		// see that we don't split multiple fields with a ','. With select we're deselecting with  -. In this case we don't want __v and passwordChangedAt to show
		select: '-__v -passwordChangedAt'
	});
	next();
});

tourSchema.post(/^find/, function (docs, next) {
	console.log(`Query took ${Date.now() - this.start} milliseconds`);
	next();
});

// // Aggregation Middleware. Blocking this because of geoNear aggregation in tourController
// tourSchema.pre('aggregate', function (next) {
// 	// with this method we're removing all the secret tours from the array of objects. Docs about pipeline: Returns the current pipeline. We're aggregating in the tourController. This middleware will happen before we'll aggregate.
// 	this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
// 	console.log(this.pipeline()); // will show pipeline object. pipeline() is a method
// 	next();
// });

// convention to Capitalize first letter of model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
