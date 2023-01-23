import HyperHTMLElement from 'hyperhtml-element/esm'
import Popper from 'popper.js'
import timer from 'minimal-timer'
// Passed to MediaRecorder.start as `timeslice` variable.
// Smaller chunksize is nice since, in case of errors, it has almost always stored something.
// No losing 15mins of recording for one error.
const CHUNKSIZE = 500
// How long is too long for worker? Let's say 10min.
const LONG_DURATION = 10 * 60 * 1000

/** 
 * All in all, the mozCaptureStream is (still) very buggy.
 *
 * [1] https://bugzilla.mozilla.org/show_bug.cgi?id=966247 
 * TL;DR: playbackRate is set to 1,and changing it will not work once recording.
 *
 * https://w3c.github.io/mediacapture-fromelement/#dom-htmlmediaelement-capturestream
 * "Muting the audio on a media element does not cause the capture to produce
 * silence, nor does hiding a media element cause captured video to stop.
 * Similarly, the audio level or volume of the media element does not affect
 * the volume of captured audio."
 *
 *
 * Audio gets muted:
 * [2] https://bugzilla.mozilla.org/show_bug.cgi?id=1178751
 *
 * MediaRecorder:
 * Errors on seeking. Always.
 * Stops recording on end, if looping. Should not do that, according to spec.
 * Some of these could be problems from captureStream, too.
 *
 */

/*
 * Workflow: record -> pauses &plays -> stop -> "preparing" -> "processing" -> final
 */
export default class LiveRecorder extends HyperHTMLElement {

	static get observedAttributes() {
		return ['target']
	}

	/**
	 * Used for unmuting audio.
	 * https://bugzilla.mozilla.org/show_bug.cgi?id=1178751
	 * ^No movement in years.
	 */
	static get audioContext() {
		if (window.liveRecorder == null) {
			//log('liveRecorder nulled??????')
			window.liveRecorder = {}
		}

		if (window.liveRecorder.context == null) {
			window.liveRecorder.context = new AudioContext
		}

		return window.liveRecorder.context
	}

	created(){
		//log('hello?')
		this.targetElement = document.querySelector(`[data-liverecorder="${this.target}"]`) 
		//log(this.targetElement, this.state, this.setState, this.data)
		if (this.targetElement != null) {
			this._shadowRoot = this.attachShadow({mode: 'closed'})
			this.popper = new Popper(this.targetElement, this, {
				placement: 'bottom'
			})

			// this.data doesn't affect render.
			this.data = []
			this.audioIsConnected = false
			
			this.timer = timer()
			let fullhostname = window.location.hostname.replace('www.', '');
			let hostname = fullhostname.replace('.com', '');
			let parturl = window.location.href

			var last = parturl.lastIndexOf('/');

			var result = parturl.substring(last + 1);
			if (result == '') {
				var result = parturl.split("/").reverse()[1];
			}
			const timeStamp = (new Date()).toISOString().replace(/[^0-9]/g, '-').slice(0, -8)
			let bongacams = /^\D{2}.bongacams/;
			//let title = this.targetElement.src.split('/')
			let title = this.targetElement.src.split('/')
			if (hostname == "chaturbate" || hostname.match(bongacams) || hostname == "livejasmin" || hostname == "cam4" || hostname == "streamate") {
				title = result + "." + timeStamp + "." + fullhostname
			} else {
				title = timeStamp + "." + fullhostname
			}

			this.fileTitle = title

			// for ( let ev of [ 'ended', 'stalled', 'seeking', 'waiting', 'emptied' ] ) {
			//  // Note: handlePause argument removed since making this.
			// 	this.targetElement.addEventListener(ev, () => this.handlePause(true))
			// }

			this.render()
		}
	}

	render() {
		const {recorder, error} = this.state
		const recording = recorder.state !== 'inactive'
		const paused = recorder.state === 'paused'
		const errored = error === '' ? 'live-recorder-none' : ''
		const realError = !error.startsWith('Whoops');
		// Using handleX style because things bug out otherwise. Maybe something to do with the polyfill.
		return this.html`
			<style>
				:host(.live-recorder-none) {
					display: none !important;
				}
				:host {
					z-index: 2147483647;
					display: block;
				}
				.live-recorder {
					all: initial;
					display: block;
					font-family: "Twemoji Mozilla";
					max-width: -moz-min-content;
					max-width: min-content;
				}
				.live-recorder-hidden {
					visibility: hidden;
				}
				.live-recorder button, .live-recorder a:not(.text-link) {
					font-family: inherit;
					-moz-appearance: button;
					appearance: button;
					background-color: white;
					border: none;
					border-radius: 5px;
					padding: 0.2em 0.7em;
					margin: 5px;
					text-align: center;
					text-decoration: none;
					cursor: pointer;
					font-family: inherit;
					font-size: 100%;
					line-height: 1;
					-moz-user-select: none;
					user-select: none;
				}
				.live-recorder-close {
					margin-left: auto;
				}
				.live-recorder-none {
					display: none !important;
				}
				.live-recorder-inner {
					display: flex;
					justify-content: space-between;
					align-items: baseline;
					background: #5f5f5f;
				}
				.live-recorder-disabled {
					cursor: wait !important;
					backgound-color: #ccc !important;
				}
				.color-white {
					color: white;
				}
				.color-white a {
					color: #d4e7ff;
				}
			</style>
			<div class="live-recorder">
				<div class="live-recorder-inner">
					<button onclick=${this.handleStartStop}
						title=${!recording ? 'Record' : 'Stop'}
						type="button"
						>
						${ !recording ? '⏺️' : '⏹️' }
					</button>

					<button onclick=${this.handlePause}
						type="button"
						title=${paused ? 'Continue recording' : 'Pause recording' }
						class=${!recording ? 'live-recorder-hidden' : ''}
						>
						${paused ? '▶️' : '⏸️'}
					</button>

					<button type="button" title="Close" onclick=${this.handleClose}>
						❎
					</button>

				</div>

				<div class=${[errored, 'live-recorder-inner'].join(' ')}>
					<span class="color-white">
						${error} <a class=${"text-link" + (realError ? '' : ' live-recorder-none') } href=${this.targetElement.src} target="_blank">Open in new tab</a>
					</span>
				</div>
			</div>
		`
	}

	get defaultState() {
		return ({
			error: '',
			recorder: { 
				state: 'inactive'
			}
		})
	}

	async handleClose() {
		this.classList.add('live-recorder-none')
		this.stop()
		this.data=[]
	}

	async handleStatus() {
		//log(this.handleStatus, this.state)
		if (this.state.error !== ''){
			//log('removing.')
			this.setState({
				error: ''
			})
		}
	}

	/**
	 * TODO: fix bug:
	 * Start rec + pause spam made start rec button stuck.
	 */
	async handlePause() {
		//log('pausing!')

		try {
			// Pause and resume are glitched and don't emit events.
			switch (this.state.recorder.state) {
				case 'recording':
					this.state.recorder.pause()
					this.timer.stop()
					break

				case 'paused':
					this.targetElement.play()
					this.state.recorder.resume()
					this.timer.resume()
					break

				default:
					//log('handlepause switch defaulted. state:', this.state)
			}
		} catch(e) {
			console.error('Live Recoder: something reasonably horrible happened in handlePause:',e)
		}
		this.render()
	}

	async handleStartStop(){
		if (this.data.length > 0) {
			this.save()
		}
		// log('startstop')
		// log(this, this.targetElement, this.data, this.state)
		//log("HELLO?")
		//log('this',this.state)
		if (this.state == null)
			this.setState( this.defaultState )
		//log(this.state)
		this.handleStatus()
		log(this.state, this.state.recorder.state)
		if (this.state.recorder.state  === 'inactive') {
			// log('start')
			// Call stop first. No harm in doing so.
			await this.stop()
			await this.start()
			// log('started', this.state)
		} else {
			//log('stop')
			await this.stop()
			//log('stopped', this.state)
		}
	}

	async start() {
		// log('in start')
		// Capturing mutes audio (Firefox bug).
		const capture = HTMLMediaElement.prototype.captureStream 
						|| HTMLMediaElement.prototype.mozCaptureStream
		const stream = capture.call(this.targetElement)
		// "Unmute".
		// Only need to do this once.
		if (!this.audioIsConnected) {
			// Try-catch because media without audio will mess up otherwise.
			try {
				const context = LiveRecorder.audioContext
				const source = context.createMediaStreamSource(stream)
				source.connect(context.destination)
				log('pluggin')
				this.audioIsConnected = true
			} catch(e) {
				// nothing
			}
		}

		// Apparently recorder types on android = no-go?
		// https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder.js#L1118
		// Testing & hoping for feedback.
		// MediaRecorder actually converts filetypes with the mimetype argument.
		// Surprising, even after reading the docs...
		const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
		const data = []
		recorder.ondataavailable = e => { log(e); data.push(e.data) }

		// These don't work.
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1363915
		// Update: they work now. v.65+. What was I supposed to do with em?
		recorder.onpause = log
		recorder.onresume = log

		/**
		 * Considering 'recorder' is instance specific,
		 * it's okay to use .onstop type listeners.
		 * One usually wants to avoid them in extensions
		 * as they steal potential existing listeners
		 * by the website.
		 */
		const stopped = new Promise((res, rej) => {
			recorder.onstop = () => res(this.timer.stop())
			recorder.onerror = async () => {
				this.stop().then(() => {
					rej({ name:'Unknown error', message: 'unlucky.' })
				})
			}
		})

		// Possible error message gets overwritten by an error with recorder?
		// Like: play() errors, now trying to recorder.start() regardless,
		//  -> error2 from recorder -> overwrite error 1.
		await this.targetElement.play().catch(e => this.error(e))

		const started = new Promise(res => {
			// Will throw (reject) if start fails.
			recorder.onstart = () => res(this.timer.start())
			recorder.start(CHUNKSIZE)
		})

		this.data = data

		// Triggers render.
		started.then(() => this.setState({ recorder }))
			.then(() => stopped)
			.catch(error => this.error(error))
			// .then(() => this.revokeExistingURL())
			// .catch(error => this.error(error))
		log('start finished. state:', this.state)
	}

	async error(e) {
		//log('error', e, e.name, e.message)
		let error
		if (e.name === 'SecurityError') {
			error = 'Security error: open the video in its own tab.'
		} else if (e.name && e.message) {
			//log( 'hello??', this.state, this.data )
			error = '' + e.name + ': ' + e.message
		} else {
			error = 'Undefined error. Stopped.'
		}
		this.stop()

		//log( this.state )

		this.setState({
			error
		})
	}

	async stop() {
		//log('in stop', this.state)
		if (this.state.recorder && this.state.recorder.state !== 'inactive') { 
			this.timer.stop()
			this.state.recorder.stop()
			this.save()
			this.data = []
			this.render()
		}
	}

	/**
	 * Wire up the save button.
	 */
	async save() {
		if (this.data.length === 0) {
			return
		}
		//log('preocessing')
		const buggyBlob = new Blob(this.data, { type: 'video/webm' })
		const time = this.timer.elapsedTime()
		let blob = buggyBlob;
		// Send to worker, unless duration is long, which causes worker to work forever.
		if (time < LONG_DURATION) {
			blob = await workIt(buggyBlob, time)
		} else {
			this.error({ message: 'File is too big to process duration metadata.', name: 'Whoops'})
		}
		// Creating the url in the worker results in CSP fiesta.
		// "Cannot load from moz-exte...."
		const downloadURL = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.download = this.fileTitle
		a.href = downloadURL
		a.click()
		URL.revokeObjectURL(downloadURL)
		this.data = []
	}
}

try{
	LiveRecorder.define('live-recorder');
} catch(e) { /* nop */ }

// eslint-disable-next-line
function log(...args) {
	// console.log('liverecorder', ...args)
}

/**
 * Messaging between worker to create a good blob.
 * Good = duration fixed.
 * Before changing this, consider that there are a lot of CSP issues.
 */
function workIt(buggyBlob, duration){
	// log('duration', duration)
	return new Promise((resolve) => {
		window.liveRecorder.worker.onmessage = e => {
			resolve(e.data)
		}
		window.liveRecorder.worker.postMessage({buggyBlob, duration})
	})
}

