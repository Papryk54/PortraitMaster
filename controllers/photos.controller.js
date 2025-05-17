const Photo = require("../models/Photo.model");
const Voter = require("../models/Voter.model");
const requestIp = require("request-ip");

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
	try {
		const { title, author, email } = req.fields;
		const file = req.files.file;

		if (!title || !author || !email || !file) {
			throw new Error("Wrong input!");
		}
		if (title.length > 25) {
			throw new Error("Title must be 25 characters or less!");
		}
		if (author.length > 50) {
			throw new Error("Author must be 50 characters or less!");
		}

		const htmlTagPattern = /<[^>]*>/g;
		if (htmlTagPattern.test(title) || htmlTagPattern.test(author)) {
			throw new Error("HTML tags are not allowed in title or author!");
		}

		const fileName = file.path.split("/").slice(-1)[0];
		const fileExt = fileName.split(".").slice(-1)[0].toLowerCase();

		if (["gif", "jpg", "jpeg", "png"].includes(fileExt)) {
			const newPhoto = new Photo({
				title,
				author,
				email,
				src: fileName,
				votes: 0,
			});
			await newPhoto.save();
			res.json(newPhoto);
		} else {
			throw new Error("You can only upload photos!");
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
	try {
		res.json(await Photo.find());
	} catch (err) {
		res.status(500).json(err);
	}
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
	try {
		const clientIp = requestIp.getClientIp(req);
		const photoId = req.params.id;

		const photoToUpdate = await Photo.findOne({ _id: photoId });
		if (!photoToUpdate) return res.status(404).json({ message: "Not found" });

		let voter = await Voter.findOne({ user: clientIp });

		if (!voter) {
			voter = new Voter({ user: clientIp, votes: [photoId] });
			await voter.save();
			photoToUpdate.votes++;
			await photoToUpdate.save();
			return res.json({ message: "Vote added, new voter created" });
		} else {
			if (!voter.votes.includes(photoId)) {
				voter.votes.push(photoId);
				await voter.save();
				photoToUpdate.votes++;
				await photoToUpdate.save();
				return res.json({ message: "Vote added" });
			} else {
				return res
					.status(500)
					.json({ message: "You already voted for this photo" });
			}
		}
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};
