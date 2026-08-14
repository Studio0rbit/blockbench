import { fs, PathModule } from '../native_apis';
import { Filesystem } from '../file_system';

export const AUDIO_FILE_EXTENSIONS = ['ogg', 'wav', 'mp3'];

/**
 * Derive a Bedrock-style sound effect name from an audio file name.
 * Matches the sanitization Blockbench uses when picking a sound file.
 */
export function audioEffectNameFromFileName(file_name) {
	return String(file_name || '')
		.toLowerCase()
		.replace(/\.[a-z0-9]+$/i, '')
		.replace(/[^a-z0-9._]+/g, '');
}

function normalizeEffectName(effect) {
	return String(effect || '').toLowerCase().replace(/[^a-z0-9._]+/g, '');
}

/**
 * Apply the sync-effect-from-filename policy to a sound data point / controller sound entry.
 */
export function applySoundFileSelection(target, file_name) {
	let effect_name = audioEffectNameFromFileName(file_name);
	if (settings.sync_sound_effect_name.value || !target.effect) {
		target.effect = effect_name;
	}
	return effect_name;
}

/**
 * Build an exact-stem → absolute path index for audio files in a directory (non-recursive).
 * If multiple files share a stem, the first wins.
 */
export function indexAudioFilesInDirectory(directory) {
	let index = new Map();
	if (!directory || !isApp) return index;

	let entries;
	try {
		entries = fs.readdirSync(directory, { withFileTypes: true });
	} catch (err) {
		console.warn('Failed to read audio directory', directory, err);
		return index;
	}

	for (let entry of entries) {
		if (!entry.isFile()) continue;
		let ext = pathToExtension(entry.name).toLowerCase();
		if (!AUDIO_FILE_EXTENSIONS.includes(ext)) continue;
		let stem = audioEffectNameFromFileName(entry.name);
		if (!stem || index.has(stem)) continue;
		index.set(stem, PathModule.join(directory, entry.name));
	}
	return index;
}

function collectSoundLinkTargets({ overwrite = false } = {}) {
	let keyframes = [];
	let controller_sounds = [];
	let animations = new Set();
	let controller_states = new Set();

	for (let animation of Animation.all) {
		let effects = animation.animators?.effects;
		if (!effects?.sound?.length) continue;
		for (let kf of effects.sound) {
			for (let data_point of kf.data_points) {
				if (!data_point.effect) continue;
				if (data_point.file && !overwrite) continue;
				keyframes.push({ animation, keyframe: kf, data_point });
				animations.add(animation);
			}
		}
	}

	for (let controller of AnimationController.all) {
		for (let state of controller.states) {
			for (let sound of state.sounds) {
				if (!sound.effect) continue;
				if (sound.file && !overwrite) continue;
				controller_sounds.push({ state, sound });
				controller_states.add(state);
			}
		}
	}

	return {
		keyframes,
		controller_sounds,
		animations: [...animations],
		controller_states: [...controller_states],
	};
}

/**
 * Exact-stem relink of unlinked (or all, if overwrite) animation / controller sounds from a folder.
 */
export function relinkAnimationSoundsFromDirectory(directory, { overwrite = false } = {}) {
	let index = indexAudioFilesInDirectory(directory);
	let targets = collectSoundLinkTargets({ overwrite });
	let linked = 0;
	let unmatched_effects = new Set();
	let linked_paths = new Set();

	if (!targets.keyframes.length && !targets.controller_sounds.length) {
		return { linked: 0, unmatched: [], skipped_empty_index: index.size === 0 };
	}

	let undo_aspects = {};
	if (targets.animations.length) undo_aspects.animations = targets.animations;
	let controllers = [...new Set(targets.controller_states.map(state => state.controller))];
	if (controllers.length) undo_aspects.animation_controllers = controllers;
	Undo.initEdit(undo_aspects);

	for (let { data_point } of targets.keyframes) {
		let stem = normalizeEffectName(data_point.effect);
		let path = index.get(stem);
		if (!path) {
			unmatched_effects.add(data_point.effect);
			continue;
		}
		data_point.file = path;
		linked_paths.add(path);
		linked++;
	}

	for (let { sound } of targets.controller_sounds) {
		let stem = normalizeEffectName(sound.effect);
		let path = index.get(stem);
		if (!path) {
			unmatched_effects.add(sound.effect);
			continue;
		}
		sound.file = path;
		linked_paths.add(path);
		linked++;
	}

	Undo.finishEdit('Relink animation sound files');

	for (let path of linked_paths) {
		Timeline.visualizeAudioFile(path, { force: true });
	}

	return {
		linked,
		unmatched: [...unmatched_effects],
		index_size: index.size,
	};
}

export function promptRelinkAnimationSounds() {
	if (!isApp) {
		Blockbench.showQuickMessage('message.relink_animation_sounds.desktop_only');
		return;
	}

	let directory = Filesystem.pickDirectory({
		resource_id: 'animation_audio',
		title: tl('dialog.relink_animation_sounds.title'),
	});
	if (!directory) return;

	let overwrite = Pressing.shift || Pressing.overrides.shift;
	let result = relinkAnimationSoundsFromDirectory(directory, { overwrite });

	if (result.skipped_empty_index) {
		Blockbench.showMessageBox({
			title: tl('dialog.relink_animation_sounds.title'),
			message: tl('message.relink_animation_sounds.no_audio_files'),
		});
		return;
	}

	if (result.linked === 0 && result.unmatched.length === 0) {
		Blockbench.showQuickMessage('message.relink_animation_sounds.nothing_to_link');
		return;
	}

	let lines = [
		tl('message.relink_animation_sounds.summary', [result.linked, result.index_size]),
	];
	if (result.unmatched.length) {
		let preview = result.unmatched.slice(0, 12).map(name => `• \`${name}\``).join('\n');
		if (result.unmatched.length > 12) {
			preview += `\n• … +${result.unmatched.length - 12}`;
		}
		lines.push(tl('message.relink_animation_sounds.unmatched', [result.unmatched.length]));
		lines.push(preview);
	}

	Blockbench.showMessageBox({
		title: tl('dialog.relink_animation_sounds.title'),
		message: lines.join('\n\n'),
	});
}

Object.assign(window, {
	audioEffectNameFromFileName,
	applySoundFileSelection,
	relinkAnimationSoundsFromDirectory,
	promptRelinkAnimationSounds,
});
