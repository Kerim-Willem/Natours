const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'Please tell us your name']
	},
	email: {
		type: String,
		required: [true, 'Please provide us your email'],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, 'Please provide us a valid email']
	},
	photo: {
		type: String,
		default: 'default.jpg'
	},
	role: {
		type: String,
		enum: ['user', 'guide', 'lead-guide', 'admin'],
		// setting a default, otherwise we always have to specify
		default: 'user'
	},
	password: {
		// NEVER save plain text passwords in the database. The model is the best place to encrypt the passwords
		type: String,
		required: [true, 'Please provide a password'],
		// It has shown that weird symbols in password doesn't necessarily make them stronger. Longer ones do.
		minLength: 8,
		// We have to make sure the password isn't visible to the client, even when it's
		select: false
	},
	passwordConfirm: {
		type: String,
		required: [true, 'Please confirm your password'],
		validate: {
			// this comes from the validator package
			validator: function (el) {
				// validator will return either true or false. This will only work on CREATE and SAVE!!!
				return el === this.password;
			},
			message: 'Passwords are not the same'
		}
	},
	// this field will stay empty if they didn't change the password in the current session
	passwordChangedAt: Date,
	passwordResetToken: String,
	passwordResetExpires: Date,
	// this is for when an user decides to delete his account. We won't delete it, put put it on inactive
	active: {
		type: Boolean,
		default: true,
		// With select: false we make sure that 'active' will not be shown to the user
		select: false
	}
});

// doing it like this so the encryption will happen between the moment when we receive the data and the moment it's persisted to the database. We call next so we have access to the next function in order to call the next middleware
userSchema.pre('save', async function (next) {
	// If the password is not modified(the password IS modified when creating or updating it), we call the next middleware.
	if (!this.isModified('password')) return next();
	// 12 in this case is a cost parameter. We also could've manually created a salt(don't worry, I also don't completely understand how this works. You can look up the documentation of bcrypt). 12/the cost is a measure how cpu intensive this operation will be. The default value is 10. But since computers are stronger, 12 is better. .hash is the asynchronous version
	this.password = await bcrypt.hash(this.password, 12);
	// for deleting the password confirm after it's confirmed
	this.passwordConfirm = undefined;
	next();
});

userSchema.pre('save', function (next) {
	// So if the password isn't just updated or newly made, don't update the 'password created at' field
	if (!this.isModified('password') || this.isNew) return next();

	// something updating to the database is slower than issuing the json webtoken. Making it so that the changed password timestamp is sometimes set a bit after the json webtoken has been created. That means the user couldn't use the newly created token to log in. Don't forget, the only reason why we're even putting in a timestamp, is so we can compare it to the timestamp of the json webtoken. we fix this issue by substracting one second of the date the token is created.
	this.passwordChangedAt = Date.now() - 1000;

	next();
});

// Middleware for not showing users that are inactive 'find' will apply for anything that comes after find = findAndUpdate, findAndDelete etc... We do this using a regular exppresion. /^ = everything that starts with. This middleware points to the current query
userSchema.pre(/^find/, function (next) {
	this.find({ active: { $ne: false } });
	next();
});

// We're creating an instance method: A method that's going to be available on all documents of a certain collection. candidatePassword is what user fills in. Because we make the password unavailable in the usermodel, we have to call the encrypted password in the database, using userpassword. bcrypt has a way of comparing the passwords, with their own algorithm. We compare the filled in password with the hashed password in our database.
userSchema.methods.correctPassword = async function (
	candidatePassword,
	userPassword
) {
	return await bcrypt.compare(candidatePassword, userPassword);
};

// will return false as default, for when user didn't change password. JWTTimestamp = timestamp of when the token was issued. The way we know what the value of JWTTimestamp is, comes from where we call this instance method, in this case if (currentUser.changedPasswordAfter(decoded.iat)). .iat = issued at
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
	// So if an user changed his password, it will be added to the user object. Only that will trigger this code. Otherwise: false
	if (this.passwordChangedAt) {
		// getTime is a javascript function. changedTimestamp are in miliseconds and jwttimestamp are in seconds. That's why we divide and parse it as an integer. 10 is the base of parseInt
		const changedTimestamp = parseInt(
			this.passwordChangedAt.getTime() / 1000,
			10
		);
		return JWTTimestamp < changedTimestamp; // 100 < 200 = true
	}

	// False means not changed: The day and time in which the token was issued, is less than the changed timestamp. So when a user changed the password after the token was signed, we will return false.
	return false;
};

// the password reset token should be a random string, and doesn't have to be as cryptografically strong as the password. That's why we add crypto(nodejsmodule). We are creating this token because we're going to send this to the user. Only the user has access this token, and is similar to a normal password. If we would just save the token to the database and a hacker comes in, he could use that token to gain access to the users account. This is why we encrypt it | We also need to save this token to the user model, so we can store it in the database. We also need to make sure the token expires. | We're going to send a non-encrypted token to the email and then compare it to the encrypted token in the database
userSchema.methods.createPasswordResetToken = function () {
	// randombytes converts it to a (32) long number. We make it a string because that's what he instance method accepts
	const resetToken = crypto.randomBytes(32).toString('hex');
	// this is for encripting the string that came back from crypto.randomBytes. sha256 is algorithm that encrypts, en then we update resetToken to the encrypted value. documentation about digest: The Hash object can not be used again after hash.digest() method has been called. Multiple calls will cause an error to be thrown
	this.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');

	// logging it as a object, so it'll tell me the variable name along with it's value. doesn't work with this.
	console.log({ resetToken }, this.passwordResetToken);

	// giving the user 10 min to reset the password (10 min) * (60 sec) * (1000 miliseconds). This doesn't save the object to the new value, it only changes is. We save it in Authcontroller
	this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

	return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
