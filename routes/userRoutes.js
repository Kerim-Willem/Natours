const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// In some special cases we create routes that don't follow the REST filosofy where the name of the url has nothing to do with the action that is performed. Here we only need post.
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// if we leave it like authController.login, even though we'll hit the route, we'll still call the login handler
router.post('/forgotPassword', authController.forgotPassword);
//patch for partial update
router.patch('/resetPassword/:token', authController.resetPassword);

// We're doing this here because it would unneccesary extra work to implement this in every route down below. This runs only after the CRUD up above. Because technically this is still all middleware (router.), and all middleware work in sequence.
router.use(authController.protect);

// for changing user document. For current logged in user
router.patch('/updateMyPassword', authController.updatePassword);

// so with getMe, we're 'faking' that the userid is coming from the url, since we're replacing the params with the userid, which we then call with getUser. This way we make sure we get the logged in user
router.get('/me', userController.getMe, userController.getUser);
// upload is created by multer. Will also put the file/information about the file on the request object
router.patch(
	'/updateMe',
	userController.uploadUserPhoto,
	userController.resizeUserPhoto,
	userController.updateMe
);
// We're not really deleting the user, but it isn't accessible anywhere anymore. So it's allowed to use it like this
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
	.route('/')
	.get(userController.getAllUsers)
	.post(userController.createUser);

router
	.route('/:id')
	.get(userController.getUser)
	.patch(userController.updateUser)
	.delete(userController.deleteUser);

module.exports = router;
