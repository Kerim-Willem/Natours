/* eslint-disable */
// the index.js is the entry point of all the frontend requests
// We're using @babel to translate new javascript into old javascript in order to show the website on older browsers.
import '@babel/polyfill';
import { displayMap } from './mapbox';
import { login, logout } from './login';
import { updateSettings } from './updateSettings';
import { bookTour } from './stripe';

// DOM ELEMENTS
const mapBox = document.getElementById('map');
const loginForm = document.querySelector('.form--login');
// The class .nav__el--logout looks weird because it's built in pug templates.
const logOutBtn = document.querySelector('.nav__el--logout');
const userDataForm = document.querySelector('.form-user-data');
const userPasswordForm = document.querySelector('.form-user-password');
const bookBtn = document.getElementById('book-tour');

// DELEGATION
// So when there is clicked on the map...
if (mapBox) {
	const locations = JSON.parse(mapBox.dataset.locations);
	displayMap(locations);
}

if (loginForm)
	// So we chose the form, and we'll listen to submit. When submit get's hit, do e. What we're doing here, is to check if loginForm = document.querySelector('.form--login') get's clicked. If it does, an eventlistener is fired that listens to 'submit', prevents loading from other pages, defines email and password by getting them from the value, from the form/elementId email and password. Then we pass in email and password into the function login, which we imported from login.js. Then we trigger the login route in the backend by making a post request, enabled by axios. If it's a success, we're redirecting the user to the homepage. If there's an error, we're using axios to fetch the error from the backend.
	loginForm.addEventListener('submit', (e) => {
		// prevents loading any other page
		e.preventDefault();
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		login(email, password);
	});

if (logOutBtn) logOutBtn.addEventListener('click', logout);

if (userDataForm)
	userDataForm.addEventListener('submit', (e) => {
		e.preventDefault();
		// for changing picture on form
		const form = new FormData();
		form.append('name', document.getElementById('name').value);
		form.append('email', document.getElementById('email').value);
		form.append('photo', document.getElementById('photo').files[0]);
		console.log(form);

		// 'data' is what is send through the axios request
		updateSettings(form, 'data');
	});

if (userPasswordForm)
	userPasswordForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		document.querySelector('.btn--save-password').textContent = 'Updating...';

		const passwordCurrent = document.getElementById('password-current').value;
		const password = document.getElementById('password').value;
		const passwordConfirm = document.getElementById('password-confirm').value;
		await updateSettings(
			{ passwordCurrent, password, passwordConfirm },
			'password'
		);

		document.querySelector('.btn--save-password').textContent = 'Save password';
		document.getElementById('password-current').value = '';
		document.getElementById('password').value = '';
		document.getElementById('password-confirm').value = '';
	});

if (bookBtn)
	bookBtn.addEventListener('click', (e) => {
		e.target.textContent = 'Processing...';
		// e. target is the element that got clicked. This will create/fire off the booking session
		const { tourId } = e.target.dataset;
		bookTour(tourId);
	});
