// https://github.com/yusitnikov/fix-webm-duration/
// ^with slight modifications.
import ysFixWebmDuration from '../../lib/fix-webm-duration/fix-webm-duration.js'

onmessage = async (e) => {

	// ??????????????????????????
	//if (!e.origin.includes(browser.extension.getURL("")))
	//	return

	const buggyBlob = e.data.buggyBlob
	const duration = e.data.duration

	//console.log('duration:', duration)
	const blob = await ysFixWebmDuration(buggyBlob, duration)
	postMessage(blob)	
}

