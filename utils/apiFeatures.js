// more information about how features work, look at tourcontrollercopy2
class APIFeatures {
	// don't forget the constructor method get's called when we create a new object out of this class. We're calling the Mongoose method query(comes from mongoose), and the querystring we get from express(comes from express), coming from the route(what we have access to in req.query). We pass the query in the constructor because we don't want to query inside of the class, because that would then bound the class to the tour resource
	constructor(query, queryString) {
		this.query = query;
		this.queryString = queryString;
	}

	filter() {
		// req.query isn't available in this class, that's why we passed in the query string, that's why we replace is with ...this.queryString. Basic Javascript
		const queryObj = { ...this.queryString };
		const excludedFields = ['page', 'sort', 'limit', 'fields'];
		excludedFields.forEach((el) => delete queryObj[el]);

		// Advanced filtering 1B
		let queryStr = JSON.stringify(queryObj);
		queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

		// this.query is stored in this.query = query
		this.query = this.query.find(JSON.parse(queryStr));

		// this here is the entire object. It returns the object, allowing us to chain methods (sort, paginate etc...). Without returning this, it won't work!
		return this;
	}

	sort() {
		if (this.queryString.sort) {
			const sortBy = this.queryString.sort.split(',').join(' ');
			this.query = this.query.sort(sortBy);
		} else {
			// for when there's no sort, this will be our default. Minus stands for ascending sort
			this.query = this.query.sort('-createdAt');
		}

		return this;
	}

	limitFields() {
		// 3. Field limiting | To reduce bandwidth, and to only show the relevant information to the client. url example: 127.0.0.1:3000/api/v1/tours?fields=name,duration,price. Just like before, Mongoose requests a string with the field name, separated by spaces. query = query.select('name duration price'). With this we're selecting only certain field names, which is called projecting. Mongoose almost always uses _v. It's not a good practice to remove them, but we can hide them. Therefore we're doing this in the default. We do this with query.select('-__v'). With select, the minus stands for excluding
		if (this.queryString.fields) {
			const fields = this.queryString.fields.split(',').join('');
			this.query = this.query.select(fields);
		} else {
			this.query = this.query.select('-__v');
		}

		return this;
	}

	paginate() {
		// 4. Pagination | By default we're defining a page 1 and a limit of 100, so when a user requests all of the tours, he'll only see 100 tours. We're doing req.query.page * 1(it's a trick), to convert the string into a number. Then by default, we want page 1. We do this with || 1. Skipping: If we're (for example) requesting page 3, with the limit of 10, the results start at 21 and end at 30. Therefore we need to skip 20 results, to come at page 3. page - 1. You can also convert to number using unary operator: const limit = +req.query.limit || 1;
		const page = this.queryString.page * 1 || 1;
		const limit = this.queryString.limit * 1 || 10;
		const skip = (page - 1) * limit;

		this.query = this.query.skip(skip).limit(limit);

		return this;
	}
}

module.exports = APIFeatures;
