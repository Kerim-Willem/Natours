/* eslint-disable */

// For hiding the alert
export const hideAlert = () => {
	const el = document.querySelector('.alert');
	if (el) el.parentElement.removeChild(el);
};

// type is 'success' or 'error'. With this, we're referring to an error or success class in css. By inserting the type and message into an div, we can then use css to make it pretty :D
export const showAlert = (type, msg, time = 7) => {
	hideAlert();
	const markup = `<div class="alert alert--${type}">${msg}</div>`;
	// afterbegin: Inside of body, but after the beginning
	document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
	// Just to state the obvious. This is for setting the duration of the alert
	window.setTimeout(hideAlert, time * 1000);
};
