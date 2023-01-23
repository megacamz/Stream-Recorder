import './undoer.js'
import '../lib/pony/index.js'
import LiveRecorder from './Recorder.js'

;(function() {
	const elements = Array.prototype.filter.call(document.querySelectorAll('video, audio, canvas'), filterPaused)

	if (elements.length === 0) {
		alert('Unpaused media elements not found!\nStart playback, then try again.')
		return
	}

	if (window.liveRecorder != null && window.liveRecorder.injected === true) {
		Array.prototype.forEach.call(elements, addRecorder)
		return
	}

	if (window.liveRecorder == null) {
		window.liveRecorder = {}
		window.liveRecorder.uniqueID = 1
		window.liveRecorder.injected = true
		window.liveRecorder.worker = new Worker(browser.extension.getURL('') + 'live-recorder-worker-bundle.js')
	}

	Array.prototype.forEach.call(elements, addRecorder)

	function addRecorder(mediaElement) {
		const target = mediaElement.dataset.liverecorder
		if (target != null) {
			showLiveRecorder(target)
		} else {
			createRecorder(mediaElement)
		}
	}

	function filterPaused(el) {
		return !el.paused
	}

	function showLiveRecorder(target) {
		const liverecorder = document.querySelector(`live-recorder[target="${target}"]`)
		liverecorder.classList.remove('live-recorder-none')
	}
	function createRecorder(mediaElement) {
		let rec = new LiveRecorder
		mediaElement.dataset.liverecorder = window.liveRecorder.uniqueID
		rec.setAttribute('target', window.liveRecorder.uniqueID++)
		document.body.appendChild(rec)
	}

})()

