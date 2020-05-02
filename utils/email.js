const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

// User will contain the emailaddress and also the name in case we want to personalise the email. We also put in a url, for for example the reset url for resetting the password. We way we're going to set this up is going to make it really easy to add newer methods, like password reset/maybe even sending the invoice
// new Email(user, url).sendWelcome();

module.exports = class Email {
	// constructor is the function that's going to be running when a new object is created through this class | Since we pass the user and the url into a new email, we have to pass this into the constructor as arguments.
	constructor(user, url) {
		this.to = user.email;
		this.firstName = user.name.split(' ')[0];
		// url is equal to the incoming url
		this.url = url;
		// emailaddress is configured in config.env
		this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;
	}

	newTransport() {
		// Create a Transporter. It's a service that sends the email. We always create a transporter, no matter what service we use. In the first example, we learn how to send emails using gmail. We put in service: 'Gmail' in the const transporter, Within createtransport, we put some options. Nodemailer knows how to deal with certain services, so we don't have to configure them. Gmail is one of them. Yahoo/hotmail and many others. Activate in gmail "less secure app" option. It is not a good idea to use Gmail for this, because you can only send 500 emails a day. And you will probably be marked as a spammer. Some well known ones are sendgrid and mailgun. For in development, we're going to use a special development service which fakes to send emails (mailtrap). We are specifying the host 'mailtrap' because it's not known to nodemailer
		if (process.env.NODE_ENV === 'production') {
			// Sendgrid for real emails
			return nodemailer.createTransport({
				service: 'SendGrid',
				auth: {
					user: process.env.SENDGRID_USERNAME,
					pass: process.env.SENDGRID_PASSWORD
				}
			});
		}
		return nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
			auth: {
				user: process.env.EMAIL_USERNAME,
				pass: process.env.EMAIL_PASSWORD
			}
		});
	}

	// this is the method that will do the actual sending. It receives a template and subject. The methods that come next, like sendWelcome, will specifically send the email to our needs. It's like send is the controller
	async send(template, subject) {
		// 1. Render the html for the email based on a pug template. For this we need to require the pug package. dirname = name of location of currently running script. We can also pass data into render file. This is important for email personalization. We do this in the last argument, curly braces
		const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
			firstName: this.firstName,
			url: this.url,
			subject
		});

		// 2) Define email options
		const mailOptions = {
			from: this.from, // See just onder constructor. This is where it comes from
			to: this.to,
			subject,
			html,
			// We need to include a textversion of our email into the email. It's important because it's better for delivery and spamfilters. In order to convert html to text, we're important the package html-to-te
			text: htmlToText.fromString(html)
		};

		// 3) Create a transport and send email
		await this.newTransport().sendMail(mailOptions);
	}

	// Send welcome email. Here's where we stack all the emails that we're going to send
	async sendWelcome() {
		await this.send('welcome', 'Welcome to the Natours Family!');
	}

	async sendPasswordReset() {
		await this.send(
			'passwordReset',
			'Your password reset token (valid for only 10 minutes)'
		);
	}
};
