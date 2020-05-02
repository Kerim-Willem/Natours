const Review = require('./../models/reviewModel');
// const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

// Midleware
exports.setTourUserIds = (req, res, next) => {
	// Allow nested Routes | so if we didn't specify the tour id in the body, then we want to define that one, as the one that comes from the url. We're adding this middleware in the reviewRoute
	if (!req.body.tour) req.body.tour = req.params.tourId;
	// We also need to do the same with the user. We get the user from the protect middleware
	if (!req.body.user) req.body.user = req.user.id;
	next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
