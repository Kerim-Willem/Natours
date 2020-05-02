const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

// With the curly braces, we're specifying which routes we want to merge. We need this because by default each router only has access to the parameters of their specific routes. But, as you can see in the router down below, there's no 'tour/:id' for example. In order to still get access to that parameter, we need to mergeParams.
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
	.route('/')
	// Thanks to mergeParams: true, the getAllReviews handler function will automatically get called whenever there's a GET request for a url that looks like: tour/234fad4/reviews, and will also get access to the tour id. We want to make sure only the reviews of the tour itself get called. We do this in getAllReviews
	.get(reviewController.getAllReviews)
	.post(
		authController.restrictTo('user'),
		reviewController.setTourUserIds,
		reviewController.createReview
	);

router
	.route('/:id')
	.get(reviewController.getReview)
	.patch(
		authController.restrictTo('user', 'admin'),
		reviewController.updateReview
	)
	.delete(
		authController.restrictTo('user', 'admin'),
		reviewController.deleteReview
	);

module.exports = router;
