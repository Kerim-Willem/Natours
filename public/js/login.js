/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// So this code is going to accept an email and a password. Also, see how we're using export to export this function, instead of module.exports, which is a node function
export const login = async (email, password) => {
	try {
		const res = await axios({
			method: 'POST',
			url: 'http://127.0.0.1:3000/api/v1/users/login',
			data: {
				email,
				password
			}
		});

		// because we always set the status to success in the backend, we can use this to verify on the frontend t
		if (res.data.status === 'success') {
			showAlert('success', 'Logged in successfully!');
			window.setTimeout(() => {
				// so we're reloading/redirecting after the login to the homepage
				location.assign('/');
				// setTimeout for 1500 miliseconds
			}, 1500);
		}
	} catch (err) {
		// one of the good things about axios is that it can retur an error! this is why we can use a try catch block instead. err.response.data.message will return the error from the server
		showAlert('error', err.response.data.message);
	}
};

export const logout = async () => {
	try {
		const res = await axios({
			method: 'GET',
			url: 'http://127.0.0.1:3000/api/v1/users/logout'
		});
		// If we make the request without sending the new empty cookie, the user page is still visible. That's why we reload the page with reload(true). Doing reload(true) will reload from the server, and not from the browser cache. So it's important to do it like this to get redirected to the login page!
		if ((res.data.status = 'success')) location.reload(true);
	} catch (err) {
		console.log(err.response);
		showAlert('error', 'Error logging out! Try again.');
	}
};
