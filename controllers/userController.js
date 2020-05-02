// Multer is a popular middleware to handle multipart formdata, which is a form encoding, which is used to upload files from a form. We also had to add a middleware to upload user data (in app.js: app.use(express.urlencoded({ extended: true, limit: '10kb' }));). Multer is used for multiple files. We will allow a user to upload a photo to the /me route.
const multer = require('multer');
// For changing images
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// // We can also store the file in the memory, so we can use it as a buffer in another process. The callbackfunction (cb) is like the next() in express. First argument of cb is an error, the second is the destination (since we don't want to store faulty files in our destination)
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
// For giving the files we upload unique file names. how we structure filename: user - userid - current timestamp - file extension
//   filename: (req, file, cb) => {
// extracting file from uploaded file. If you look at the console output from uploading a file, you can see in the object that has a lot of usefull variables in it. in this example: Mimetype: 'image/jpeg'
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

const multerStorage = multer.memoryStorage();

// Goal is to test if the uploaded file is an image. We don't want other type of files (like virusses)
const multerFilter = (req, file, cb) => {
	// if it's an image, mimetype will always start with image/. startsWith is a JavaScript method.
	if (file.mimetype.startsWith('image')) {
		cb(null, true);
	} else {
		cb(new AppError('Not an image! Please upload only images.', 400), false);
	}
};

// We also could've put the filter and storage in this variable, but Jonas says this looks cleaner.
const upload = multer({
	storage: multerStorage,
	fileFilter: multerFilter
});

// Users will not upload round images by itself. We want to resize them into a smaller, round image that they can use as a profile picture.
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
	if (!req.file) return next();

	req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
	// These operations take some time so therefore it's best to async them. They shouldn't block the event loop
	await sharp(req.file.buffer)
		.resize(500, 500)
		.toFormat('jpeg')
		.jpeg({ quality: 90 })
		.toFile(`public/img/users/${req.file.filename}`);

	next();
});

// ...allowedFields will contain an arrow of all the allowed fields that we passed in (so all the fields, after the obj). We're going to loop through the object and for each element check if it's one of the right fields. Probably better ways of doing this
const filterObj = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach((el) => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

// We are fetching the user, based on the logged in user, not on what's inside of the parameter. That's why we create the middleware, before we call the factory function. req.params.id is what the factory function uses. So we first request the id of the param, and then of the user. So now when we call getMe, we're getting the user.
exports.getMe = (req, res, next) => {
	req.params.id = req.user.id;
	next();
};

// For updating userinformation
exports.updateMe = catchAsync(async (req, res, next) => {
	// 1) Create error if user POSTs password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(
			new AppError(
				'This route is not for password updates. Please use /updateMyPassword.',
				400
			)
		);
	}

	// 2) Filtered out unwanted fields names that are not allowed to be updated
	const filteredBody = filterObj(req.body, 'name', 'email');
	// Saving the actual name of the uploaded image to the user document
	if (req.file) filteredBody.photo = req.file.filename;

	// 3) Update user document. If we want to update the user info, we'll get an error because some fields are required. We have to bypass this. Because we're not dealing with sensitive data, like the password, we can now use findById. Setting new to true so we're setting the new object to the old one. We're putting filteredBody here because we don't want to update everything that's in the body(for example: body.role: admin). Or the reset token etc... if we would've wanted the entire body to be updatable, we could've put req.body instead of filteredBody. We want to filter the data that we want to keep. filterObj(req.body, 'name', 'email')
	const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
		new: true,
		runValidators: true
	});

	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser
		}
	});
});

// we don't delete all the information, since the user can't do that. But we set the data in the database to inactive
exports.deleteMe = catchAsync(async (req, res, next) => {
	await User.findByIdAndUpdate(req.user.id, { active: false });

	res.status(204).json({
		// 204 is status for deleted. Even though we're not deleting it, we're showing it!
		status: 'success',
		data: null
	});
});

exports.createUser = (req, res) => {
	res.status(500).json({
		status: 'error',
		message: 'This route is not defined! Please use /signup instead'
	});
};

exports.getUser = factory.getOne(User);
// We're not using the populate object here
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
// We can only do this as an admin. With this function, we're really deleting the user!
exports.deleteUser = factory.deleteOne(User);
