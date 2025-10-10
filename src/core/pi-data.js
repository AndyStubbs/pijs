/**
 * Pi.js - Core Data Module
 * 
 * Central data storage for Pi.js, equivalent to legacy m_piData.
 * 
 * @module core/pi-data
 */

import { logError } from "./errors.js";

// Central Pi.js data storage
export const piData = {
	"nextScreenId": 0,
	"screens": {},
	"activeScreen": null,
	"images": {},
	"imageCount": 0,
	"defaultPrompt": String.fromCharCode( 219 ),
	"defaultFont": {},
	"nextFontId": 0,
	"fonts": {},
	"defaultPalette": [],
	"defaultColor": 7,
	"commands": {},
	"screenCommands": {},
	"defaultPenDraw": null,
	"pens": {},
	"penList": [],
	"blendCommands": {},
	"blendCommandsList": [],
	"defaultBlendCmd": null,
	"settings": {},
	"settingsList": [],
	"volume": 0.75,
	"log": logError,
	"isTouchScreen": false,
	"defaultInputFocus": typeof window !== "undefined" ? window : null
};

// Command list for processCommands
export const commandList = [];

// Ready system
export let waitCount = 0;
export let waiting = false;
export const readyList = [];
export let startReadyListTimeout = 0;

export function setWaitCount( count ) {
	waitCount = count;
}

export function setWaiting( state ) {
	waiting = state;
}

export function setStartReadyListTimeout( timeout ) {
	startReadyListTimeout = timeout;
}

