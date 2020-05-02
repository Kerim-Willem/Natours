const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
// const reviewController = require('./../controllers/reviewController'); For POSTing and GETting reviews
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// So in some cases we want outside sources to have access to our api, for example for getting all the tours

// For POSTing and GETting reviews. Nested Route section. So making sure the tour route is hit, then the tour id, then the review. this is a bit messy. It's a review route within the tour route. And this same code is also in the review route, making up for duplicate code. So we're doing this via an advanced express feature 'merge params'
// router
// 	.route('/:tourId/reviews')
// 	.post(
// 		authController.protect,
// 		authController.restrictTo('user'),
// 		reviewController.createReview
// 	);

// merge params/mounting a router. So this tour router should use the review router, in case it ever encounters a route like this. Don't forget 'router' is just middleware. So it hit's the tour route, and from here, be directed to the reviewrouter. But we need to enable the reviewrouter to get access to this parameter :tourId/reviews as well
router.use('/:tourId/reviews', reviewRouter);

// Aliassing. For example if you want a shortcut to different sorting settings. We'll be using middleware for this
router
	.route('/top-5-cheap')
	.get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
	.route('/monthly-plan/:year')
	.get(
		authController.protect,
		authController.restrictTo('admin', 'lead-guide', 'guide'),
		tourController.getMonthlyPlan
	);

// For using aggregation to calculate the distance from each tour
router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

// standard way of specifying url's that have a lot of options. latlng stands for longitude/latitute. We also could've done: /tours-dastance?distance=233&center=-40,45&unit=km. but now we get /tours-distance/233/center/-40,45/unit/km
router
	.route('/tours-within/:distance/center/:latlng/unit/:unit')
	.get(tourController.getToursWithin);

router
	.route('/')
	// we didn't wrap the .get with catchAsync because not all functions we'll pass in here will be asynchronous. That's why we created catchAsync.js. Before we send this request, we want to see wether or not a user is already logged in. That's why we pass in the middleware function. We're not protecting the GET AllTours route, because we want to expose this route as much as possible
	.get(tourController.getAllTours)
	.post(
		authController.protect,
		authController.restrictTo('admin', 'lead-guide'),
		tourController.createTour
	);

router
	.route('/:id')
	.get(tourController.getTour)
	.patch(
		authController.protect,
		authController.restrictTo('admin', 'lead-guide'),
		tourController.uploadTourImages,
		tourController.resizeTourImages,
		tourController.updateTour
	)
	.delete(
		authController.protect,
		authController.restrictTo('admin', 'lead-guide'),
		tourController.deleteTour
	);

module.exports = router;
