const mongoose = require('mongoose');
//in order to import the tour statistics from the reviews, we're importing Tour
const Tour = require('./tourModel');
const reviewSchema = new mongoose.Schema(
	{
		review: {
			type: String,
			minlength: [10, 'A review must have more or equal than 10 character'],
			required: [true, 'Review cannot be empty']
		},
		rating: {
			type: Number,
			min: [1, 'Ratings must be above 1.0'],
			max: [5, 'Ratings must be below 5.0']
		},
		createdAt: {
			type: Date,
			default: Date.now(),
			// We're doing this so it doesn't show on the client side
			select: false
		},
		tour: {
			// Parent referencing. see how with parent referencing, we're not wrapping tour in an array
			type: mongoose.Schema.ObjectId,
			ref: 'Tour',
			required: [true, 'review must belong to a tour']
		},
		user: {
			type: mongoose.Schema.ObjectId,
			ref: 'User',
			required: [true, 'review must belong to a user']
		}
	},
	// We're making sure that we're able to show virtual properties in JSON and Object outputs
	{
		// If the data gets converted to json or an object, show the virtuals
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

// For preventing users from posting multiple reviews on the same tour. The third argument are options. Here we're creating a compound index out of tour and user, while the number stands for ascending/descending. For every index we make, we set the value to be unique. So when the same user posts a review, it's not unique anymore. If you try this function on a new application, there's a change it might not work immediately. Jonas said it worked the next day for him.
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// // To make sure the tours and users are shown on the reviews. Specifying populate because we don't want to show all the tour and user information.
// reviewSchema.pre(/^find/, function (next) {
// 	this.populate({
// 		// with tour, we're referring to the 'tour' from the model, that refers to Tour from the tourModel
// 		path: 'tour',
// 		// we select only the name to be displayed
// 		select: 'name'
// 	}).populate({
// 		path: 'user',
// 		// we're not seeing the photo if we didn't specify one
// 		select: 'name photo'
// 	});

// 	next();
// });

// We've deleted tour, because we don't want the information about the tour, to be displayed with the review. We're using virtual populate in the tourmodel for displaying the review. So the tour is already showing all the info about the tour!
reviewSchema.pre(/^find/, function (next) {
	this.populate({
		path: 'user',
		select: 'name photo'
	});

	next();
});

// Storing a summary of a related dataset on the main dataset is an useful technique to prevent constant queries of the related dataset. That's why we're going to store the ratings and average rating on each tour, so we don't have to query all the reviews and calculate the average each time that we query for all the tours. That could be useful for a page with a tour overview, where we don't want to display all the reviews, but still want to show the summary of these reviews. Like the number of reviews and the average rating. We have the ratingsaverage and the ratingsquantity already defined in the user model. But we still have to calculate the average rating and the ratingsquantity. We're using a static method because 'this.' points to the model and we need to call aggregate always on the model. Stackoverflow about .statics Database logic should be encapsulated within the data model. Mongoose provides 2 ways of doing this, methods and statics. Methods adds an instance method to documents whereas Statics adds static "class" methods to the Models itself. | The reason why we're calling a static method here, is because we needed to call to the aggregate function on the model. In a static method, the this variable calls to a method.
reviewSchema.statics.calcAverageRatings = async function (tourId) {
	// Don't forget aggregate works in steps/phases.
	const stats = await this.aggregate([
		{
			// if tourId was just tour, then: $match: {tour}. This is for only selecting the tour we want to update. The 'this' tourId
			$match: { tour: tourId }
		},
		{
			$group: {
				// In the first phase, we need to specify the id. The common field that all the documents have in commen, is tour. We're grouping the tours together by tour
				_id: '$tour',
				// for counting the number of ratings
				nRating: { $sum: 1 },
				// remember that each review has a rating field. That's what $rating is referring to.
				avgRating: { $avg: '$rating' }
			}
		}
	]);
	// console.log(stats);

	// We only want to do update when there's something to update. Updating it while it's blanco will create an error.
	if (stats.length > 0) {
		// For implementing the numbers into the tours. We could store this in a variable but we don't need the tour here. All we want to do is update it.
		await Tour.findByIdAndUpdate(tourId, {
			// if we log stats, you'll see in the console that the stats are returned in an array. The first one is the nRating, the second one the avgRating. That's why we call nRating and avgRating with [0] as it's in the first object in the array.
			ratingsQuantity: stats[0].nRating,
			ratingsAverage: stats[0].avgRating
		});
		// So if there's nothing to update, we want to go back to the default
	} else {
		await Tour.findByIdAndUpdate(tourId, {
			ratingsQuantity: 0,
			ratingsAverage: 4.5
		});
	}
};

// We're using this middleware each time a new review is created, for calculating the new average of the tour. We're using post because the review isn't in the collection just yet. Leaving it at pre will create issues. The post does not get access to next!
reviewSchema.post('save', function () {
	// this points to current review and tour. If we would leave this here without the constructor, the middleware would be called before the actual document is created, which will make it not work. Just putting this middleware after const Review = mongoose.model('Review', reviewSchema); wouldn't work either. Because then the reviewSchema, would not contain this middleware. Because we would then only be declaring it after the reviewmodel was already created(because we're trying to make this middleware happen before 'save'). This constructor will point to the model. Constructor is the model who created that document. Therefore, this.constructor stands for the tour
	this.constructor.calcAverageRatings(this.tour);
});

// 1. Doing this for updated and deleted reviews is more difficult, since the update and delete middleware is querymiddleware, and not document middleware. In the query we don't have direct access to the document in order to then do something similar to for example this.constructor.calcAverageRatings(this.tour). Remember we need access to the current review so that from there we can extract the tourId and then calculate the statistics from there. This here is a nice workaround trick
reviewSchema.pre(/^findOneAnd/, async function (next) {
	// the goal is to access the current review document. The this keyword is the current query. Therefore we'll execute this document, so it then will be processed, so after that we can use it. That's why we're saving it. this.findOne() will return an object with the tour id inside of it. To use the data later, we're saving it in this.r. With this, we're creating a property on the this variable.
	this.r = await this.findOne();
	next();
});

// 2. We have to make sure we don't use calcAverageRatings here, because we're still working with the data that came from the database, with the old value. We have to use the updated values. with .post it wasn't neccecary, since we're working with the data after it was saved. That's why we're using the post.method
reviewSchema.post(/^findOneAnd/, async function () {
	// How we'll get the tour data is to get it from the pre middleware. This.r is the review | await this.findOne(); does NOT work work since the query has already been executed. So remember, with the pre/^findOneAnd/ we don't have access to the current review document. So this.r is the document we get when we call findOneAnd. After that, we point to the model from the FindOneAnd document, and then calculate the average of the tour that we can with FindAndOne, which points at the right tour.
	await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
