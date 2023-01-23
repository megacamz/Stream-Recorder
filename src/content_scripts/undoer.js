// "X-ray issues" make WeakMap not work correctly with web-extensions.
// The 'document-register-element' library has a polyfill in it. Let's use it.
// https://bugzilla.mozilla.org/show_bug.cgi?id=1505511
if (!window.liveRecorder && (new window.WeakMap).get === undefined)
	window.WeakMap = null

