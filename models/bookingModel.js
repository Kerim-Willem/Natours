const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
	tour: {
		type: mongoose.Schema.ObjectId,
		// parentreferencing
		ref: 'Tour',
		required: [true, 'Booking must belong to a Tour!']
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: [true, 'Booking must belong to a User!']
	},
	price: {
		type: Number,
		require: [true, 'Booking must have a price.']
	},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	paid: {
		// doing this for if in any case an administrator wants to create a booking outside of stripe. For example for if a customer doesn't have a credit card and wants to pay directly in the store or with cash.
		type: Boolean,
		default: true
	}
});

bookingSchema.pre(/^find/, function (next) {
	this.populate('user').populate({
		path: 'tour',
		select: 'name'
	});
	next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
