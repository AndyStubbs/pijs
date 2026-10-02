// Saved sounds (kept in localStorage) and the in-memory history of recent sounds

import { fromSynthOptions } from "./params.js";
import { restoreEffects } from "./effects.js";

const STORAGE_KEY = "pijs-sfx-lab.saved";
const HISTORY_MAX = 40;

let m_saved = load();
const m_history = [];

function load() {
	try {
		const raw = localStorage.getItem( STORAGE_KEY );
		const list = raw ? JSON.parse( raw ) : [];
		return Array.isArray( list ) ? list.filter( e => e && typeof e.name === "string" && e.params ) : [];
	} catch( err ) {
		console.warn( "Could not read saved sounds:", err );
		return [];
	}
}

function store() {
	try {
		localStorage.setItem( STORAGE_KEY, JSON.stringify( m_saved ) );
		return true;
	} catch( err ) {
		console.warn( "Could not save sounds:", err );
		return false;
	}
}

// entry: { name, category, seed, params, layers, hold, effects }. params is the first layer;
// entries saved before sounds had layers hold only params.
function snapshot( entry ) {
	return JSON.parse( JSON.stringify( entry ) );
}

// Turns a stored entry back into editable state
export function restore( entry ) {
	return {
		"name": entry.name,
		"category": entry.category || "custom",
		"seed": Number.isInteger( entry.seed ) ? entry.seed : null,
		"layers": ( Array.isArray( entry.layers ) && entry.layers.length > 0 ?
			entry.layers : [ entry.params ] ).map( fromSynthOptions ),
		"hold": entry.hold === true,
		"effects": entry.effects ? restoreEffects( entry.effects ) : null
	};
}

export function getSaved() {
	return m_saved;
}

export function getHistory() {
	return m_history;
}

// Saves under a name, replacing an entry with the same name. Returns false if storage failed.
export function save( entry ) {
	const copy = snapshot( entry );
	const index = m_saved.findIndex( e => e.name === copy.name );
	if( index === -1 ) {
		m_saved.unshift( copy );
	} else {
		m_saved[ index ] = copy;
	}
	return store();
}

export function remove( index ) {
	m_saved.splice( index, 1 );
	store();
}

export function addHistory( entry ) {
	m_history.unshift( snapshot( entry ) );
	if( m_history.length > HISTORY_MAX ) {
		m_history.length = HISTORY_MAX;
	}
}
