let dir = prompt('save directory name:')

await fetch('http://127.0.0.1:8080/config', {
	method: 'POST',
	body: JSON.stringify({ dir }),
	headers: { 'content-type': 'application/json' }
});

let challs = (await (await fetch('/api/v1/challenges')).json()).data;

for (const chall of challs) {
	let cd = (await (await fetch(`/api/v1/challenges/${chall.id}`)).json()).data;
	cd = await (await fetch(`http://127.0.0.1:8080/challenge`, {
		method: 'POST',
		body: JSON.stringify(cd),
		redirect: 'follow',
		headers: {
			'content-type': 'application/json'
		}
	})).json();

	const links = cd.description?.match(/\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g) ?? [];
	const suspectedFiles = [...cd.files, ...links];
	for (const attachment of suspectedFiles) {
		console.info("Downloading ", attachment);
		try {
			let r;
			try {
				r = await fetch(attachment, {
					mode: 'no-cors'
				});
			} catch (e) {
				if (String(e).includes('CORS')) {
					r = { status: 0 };
				} else if (String(e).includes('HTTPS')) {
					r = { status: 0 };
				} else {
					throw e;
				}
			}

			let blob = await r.blob();
			if (r.status == 0) {
				// use proxy
				let url = attachment;

				if (url[0] == '/') {
					url = location.origin + attachment;
				}

				r = await fetch('http://127.0.0.1:8080/proxy', {
					method: 'POST',
					body: JSON.stringify({ url }),
					headers: { 'content-type': 'application/json' }
				});
				blob = await r.blob();
			}

			let formData = new FormData();
			formData.append('file', blob, attachment.split('/').at(-1).split('?')[0]);

			let r2 = await fetch(`http://127.0.0.1:8080/challenge/${cd.category}/${cd.name}/attachment`, {
				method: 'POST',
				body: formData
			});

			console.info("Content downloaded and uploaded:", url);
		} catch (e) {
			console.error(cd.name, e);
		}
	}
}