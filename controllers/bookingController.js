const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
	// 1) Get the currently booked tour
	const tour = await Tour.findById(req.params.tourId);
	console.log(tour);

	// 2) Create checkout session. Async because we're awaiting Stripe. Can take a while.
	const session = await stripe.checkout.sessions.create({
		// only three options are required: payment_method_types. Card is for creditcard. success_url = url that will be called as soon as the creditcard has been succesfully called. User get's redirected to the homepage(maybe good for an upsell?). And cancelurl, for when the user refuses the current payment. In this case we're sending them to the tour page
		payment_method_types: ['card'],
		success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${
			req.params.tourId
		}&user=${req.user.id}&price=${tour.price}`,
		cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
		// handy for already filling in emailaddress of client. Since it's a protected route, the email is already available
		customer_email: req.user.email,
		// This field is going to allow us to pass in some data about the session that we're currently creating. Important for when the payment was successful, because then we get access to the session object again. By then, we want to create a new booking in our database(which only works with deployed websites). | To create a new booking in our database we need the users id, the tour id and the price. In this session we already have access to the user's email. We therefore need the tour id and the price (at line_items).
		client_reference_id: req.params.tourId,
		// Specifying product. Field names come from Stripe. Images need to be live images(accessable on the internet, Stripe renders them).
		line_items: [
			{
				name: `${tour.name} Tour`,
				description: tour.summary,
				images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
				// multiply by 100 because the price is expected as cents
				amount: tour.price * 100,
				// for euro = eur. Look at stripe for documentation
				currency: 'usd',
				quantity: 1
			}
		]
	});

	// 3) Create session as response
	res.status(200).json({
		status: 'success',
		session
	});
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
	// This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
	const { tour, user, price } = req.query;

	if (!tour && !user && !price) return next();
	await Booking.create({ tour, user, price });

	// originalURL is the original url from which the request came. We split it it to get everything before the first questionmark: `${req.protocol}://${req.get('host')}/my-tours/?tour=${	req.params.tourId}&user=${req.user.id}&price=${tour.price}`, which is the homepage! So we're redirecting to the homepage when the bookingsession has completed. We do this in this way, because we can only use the eventual way, with webhooks, as soon as the website is live.
	res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
