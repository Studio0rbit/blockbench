/// <reference types="./blockbench"/>
declare namespace Timeline {
	const animators: GeneralAnimator[]
	const selected: _Keyframe[]
	const playing_sounds: Array<{
		keyframe_id: string
		audio_path: string
		source: AudioBufferSourceNode
		gain: GainNode
		started_at: number
		start_offset: number
		rate: number
		duration: number
		stutter_timeout?: any
	}>
	let audio_context: AudioContext | null
	function getAudioContext(): AudioContext
	function stopSound(keyframe_id?: string, audio_path?: string): void
	function disposeAllSounds(): void
	function invalidateAudioFile(path: string): void
	function visualizeAudioFile(path: string, options?: {force?: boolean}): Promise<number[]> | number[]
	function getSoundEntry(keyframe_id: string, audio_path: string): any
	function getSoundCurrentTime(entry: any): number
	function playSound(keyframe_id: string, audio_path: string, offset?: number, options?: {
		rate?: number
		volume?: number
		max_duration?: number
	}): any
	let playback_speed: number
	/**
	 * Current time
	 */
	let time: number
	let playing: boolean
	let vue: Vue

	/**
	 * Set the timeline to a specific time
	 * @param time Time in seconds
	 * @param editing If true, don't update the timeline timecode, because it is currently edited by the user
	 */
	function setTime(time: number, editing?: boolean): void
	/**
	 * Reveal the specified time in the timeline by scrolling to it's position
	 * @param time Time in seconds
	 */
	function revealTime(time: number): void
	/**
	 * Set the time code above the timeline to a specific time
	 * @param time Time in seconds
	 */
	function setTimecode(time: number): void
	/**
	 * Converts the input time to a time that is snapped to the current timeline snapping setting
	 * @param time Time in seconds
	 * @param animation Animation to use the snapping setting from. If unspecified, uses the selected animation
	 */
	function snapTime(time: number, animation?: _Animation): number
	/**
	 * Returns the time between two snapping points
	 */
	function getStep(): number
	/**
	 * Return the maximum length of the timeline, based on the length of the selected animation and the time of all keyframes
	 */
	function getMaxLength(): number

	/**
	 * Unselect the selected keyframes
	 */
	function unselect(): void
	/**
	 * Start playing the animation
	 */
	function start(): void
	/**
	 * Run one frame of the animation
	 */
	function loop(): void
	/**
	 * Pause playing the animation
	 */
	function pause(): void

	let keyframes: _Keyframe[]
	let menu: Menu
	function showMenu(event: Event): void
	let selected_animator: GeneralAnimator | null
}
