async function inject() {
	const files = [
		'/bundle.js'
	]
	for (let file of files) {
		await browser.tabs.executeScript({
			file: file
		}).catch(console.error)
	}
}

browser.browserAction.onClicked.addListener(inject)

