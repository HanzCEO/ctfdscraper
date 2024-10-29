let dir = prompt('save directory name:')

await fetch('https://127.0.0.1:8080/config', {
	method: 'POST',
	body: JSON.stringify({ dir }),
	headers: { 'content-type': 'application/json' }
});

let challs = (await (await fetch('/api/v1/challenges')).json()).data;

for (const chall of challs) {
	let cd = (await (await fetch(`/api/v1/challenges/${chall.id}`)).json()).data;
	cd = await (await fetch(`https://127.0.0.1:8080/challenge`, {
		method: 'POST',
		body: JSON.stringify(cd),
		redirect: 'follow',
		headers: {
			'content-type': 'application/json'
		}
	})).json();

	const links = cd.description?.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/g) ?? [];
	const suspectedFiles = [...cd.files, ...links];
	for (const attachment of suspectedFiles) {
		console.info("Downloading ", attachment);
		try {
			let r, blob;
			let url = attachment;

			try {
				r = await fetch(url, {
					mode: 'no-cors'
				});
			} catch (e) {
				if (String(e).includes('CORS')) {
					r = { status: 0 };
				} else if (String(e).includes('HTTPS')) {
					r = { status: 0 };
				} else if (String(e).includes('NetworkError')){
					r = { status: 0 };
				} else {
						throw e;
				}
			}

			if (r.status == 0) {
				// use proxy
				if (url[0] == '/') {
					url = location.origin + attachment;
				}

				r = await fetch('https://127.0.0.1:8080/proxy/?url=' + encodeURIComponent(url));
				blob = await r.blob();
			}
			if (!blob && r.status != 0) blob = await r.blob();

			let formData = new FormData();
			formData.append('file', blob, attachment.split('/').at(-1).split('?')[0]);

			let r2 = await fetch(`https://127.0.0.1:8080/challenge/${cd.category}/${cd.name}/attachment`, {
				method: 'POST',
				body: formData
			});

			console.info("Content downloaded and uploaded:", url);
		} catch (e) {
			console.error(cd.name, e);
		}
	}
}