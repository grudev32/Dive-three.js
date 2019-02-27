/**
* This file holds configurable parameters of the game.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/

const CONFIG = {
	BOT: {
		MOVEMENT: {
			MAXSPEED: 3 // meter/seconds
		},
		HEAD: {
			HEIGHT: 1.8 // meter
		},
		GOAL: {
			UPDATE_FREQUENCY: 5 // number per seconds
		},
		MEMORY: {
			SPAN: 3 // seconds
		},
		NAVIGATION: {
			NEXT_WAYPOINT_DISTANCE: 2, // meter
			ARRIVE_DECELERATION: 2, // unitless
			ARRIVE_TOLERANCE: 2 // meter
		},
		TARGET_SYSTEM: {
			UPDATE_FREQUENCY: 5 // number per seconds
		},
		VISION: {
			UPDATE_FREQUENCY: 5 // number per seconds
		},
		WEAPON: {
			UPDATE_FREQUENCY: 4, // number per seconds
			REACTION_TIME: 0.2, // seconds
			AIM_ACCURACY: 3 // world units
		},
	},
	BLASTER: {
		ROUNDS_LEFT: 12, // number
		ROUNDS_PER_CLIP: 12, // number
		AMMO: 48, // number
		MAX_AMMO: 96, // number
		SHOT_TIME: 0.4, // seconds
		RELOAD_TIME: 1.6, // seconds
		MUZZLE_TIME: 0.03 // seconds

	},
	SHOTGUN: {
		ROUNDS_LEFT: 6, // number
		ROUNDS_PER_CLIP: 6, // number
		AMMO: 24, // number
		MAX_AMMO: 48, // number
		SHOT_TIME: 1.2, // seconds
		RELOAD_TIME: 1.6, // seconds
		SHOT_RELOAD_TIME: 0.5, // seconds
		MUZZLE_TIME: 0.03, // seconds
		SPREAD: 0.04,
		BULLETS_PER_SHOT: 6 // number

	},
	BULLET: {
		MAXSPEED: 400, // meter/seconds
		LIFETIME: 1, // seconds,
		DAMAGE: 25 // health points
	}
};

export { CONFIG };
