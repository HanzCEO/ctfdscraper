let dir = prompt('save directory name:')

await fetch('http://127.0.0.1:8080/config', {
	method: 'POST',
	body: JSON.stringify({ dir }),
	headers: { 'content-type': 'application/json' }
});

let challs = (await (await fetch('/api/v1/challenges')).json()).data;

for (const chall of challs) {
	let cd = (await (await fetch(`/api/v1/challenges/${chall.id}`)).json()).data;
	await fetch(`http://127.0.0.1:8080/challenge`, {
		method: 'POST',
		body: JSON.stringify(cd),
		headers: {
			'content-type': 'application/json'
		}
	});

	const links = cd.description.match(/\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g) ?? [];
	const suspectedFiles = [...cd.files, ...links];
	for (const attachment of suspectedFiles) {
		console.info("Downloading ", attachment);
		try {
			let r = await fetch(attachment, { mode: 'no-cors' });
			let blob = await r.blob();
			if (r.status == 0) {
				// use proxy
				r = await fetch('http://127.0.0.1:8080/proxy', {
					method: 'POST',
					body: JSON.stringify({ url: attachment }),
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
		} catch (e) {
			console.error(cd.name, e);
		}
	}
}