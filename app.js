const fs = require('fs');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

const { Readable } = require('stream')

const app = express();
let config = {
	dir: ''
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const upload = multer({ dest: './uploads' })

app.use(cors());
app.use(express.json());

app.post('/config', (req, res) => {
	config = req.body;
	console.dir(config);
	res.end();
});

app.post('/challenge', (req, res) => {
	const cat = req.body.category.replace(/[^a-z0-9_\(\)\[\]\-]/gi, '');
	const name = req.body.name.replace(/[^a-z0-9_\(\)\[\]\-]/gi, '');

	const theDir = `${config.dir}/${cat}/${name}`;
	fs.mkdir(theDir, { recursive: true }, (e) => {
		if (e) {
			throw new Error(`Can't make directory ${theDir}`);
		}

		const content = `# ${req.body.name}\n\n` +
						`${req.body.attribution ? '> Author: ' + req.body.attribution : ''}\n\n` +
						req.body.description.replaceAll('\r\n', '\n') +
						`\n\n${req.body.connection_info ?? ''}`;

		fs.writeFile(`${theDir}/README.md`, content, (e) => {
			if (e) {
				throw new Error(`Can't make README ${theDir}/README.md`);
			}
			console.log(`Written challenge ${name} description`);
			res.json({
				...req.body,
				category: cat,
				name: name
			});
		});
	});
});

app.post('/challenge/:chalCategory/:chalName/attachment', upload.single('file'), (req, res) => {
	res.end();

	const cat = req.params.chalCategory.replace(/[^a-z0-9_\(\)\[\]\-]/gi, '');
	const name = req.params.chalName.replace(/[^a-z0-9_\(\)\[\]\-]/gi, '');
	const theDir = `${config.dir}/${cat}/${name}`;
	
	fs.rename(req.file.path, `${theDir}/${req.file.originalname}`, () => {});
	console.log(`Got file for ${cat}/${name}: ${req.file.originalname}. Saved to ${theDir}/${req.file.originalname}`);
});

app.post('/proxy', async (req, res) => {
	const url = req.body.url;
	try {
		const fetchResponse = await fetch(url);

		if (!fetchResponse.ok) {
			return res.status(fetchResponse.status).send('Error fetching data');
		}

		fetchResponse.headers.forEach((value, name) => {
    		res.setHeader(name, value);
        });

		const readableStream = Readable.fromWeb(fetchResponse.body);
        readableStream.pipe(res);
	} catch (error) {
		console.error('Error fetching data:', error);
		res.status(500).send('Internal Server Error');
	}
});

app.listen(8080, () => {
	console.log("[i] Listened to localhost 8080");
});