const express = require('express');
// all the exports in tourController will be available in const tourController in this map. Because we've destructured it down below, we're not calling this
const tourController = require('./../controllers/tourController');
// const {
// 	getAllTours,
// 	createTour,
// 	getTour,
// 	updateTour,
// 	deleteTour
// } = require('./../controllers/tourController');

// 3 Routes

// It's a good practice to put the version number in your api, in case you want to do some changes to your api, without breaking everyone who's using the previous version. First you tell the route to the api, afterwards you instantiate the handler (with is req, res). In this function, the event loop will 'go'. Therefore, we can't use codeblocking code. We can do that outside of the code

// app.get('/api/v1/tours', getAllTours);
// app.get('/api/v1/tours/:id', getTour);
// app.post('/api/v1/tours', createTour);
// app.patch('/api/v1/tours/:id', updateTour);
// app.delete('/api/v1/tours/:id', deleteTour);

// tourRouter is a new middleware for mounting a new router
const router = express.Router();

// Param middleware is a middleware that only runs for certain parameters. With the param middleware, we get access to a fourth argument (val) for value
// router.param('id', tourController.checkID);

// create a checkBody middleware that only runs for
// check if body contains the name and price property
// if not send back 400 (bad request)
// add it to the post handler stack(by adding function before tourController.createTour)

// destructured
router
	.route('/')
	.get(tourController.getAllTours)
	.post(tourController.checkBody, tourController.createTour);

router
	.route('/:id')
	.get(tourController.getTour)
	.patch(tourController.updateTour)
	.delete(tourController.deleteTour);

// router.route('/').get(getAllTours).post(createTour);

// router.route('/:id').get(getTour).patch(updateTour).delete(deleteTour);

module.exports = router;
