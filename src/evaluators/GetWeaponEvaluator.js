import { GoalEvaluator, MathUtils } from '../lib/yuka.module.js';
import { Feature } from '../core/Feature.js';
import { GetItemGoal } from '../goals/GetItemGoal.js';
import { WEAPON_TYPES_SHOTGUN } from '../core/Constants.js';

/**
* Class for representing the get-weapon goal evaluator. Can be used to compute a score that
* represents the desirability of the respective top-level goal.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class GetWeaponEvaluator extends GoalEvaluator {

	/**
	* Constructs a new get weapon goal evaluator.
	*
	* @param {Number} characterBias - Can be used to adjust the preferences of the enemy.
	* @param {Number} weaponType - The weapon type.
	*/
	constructor( characterBias = 1, weaponType ) {

		super( characterBias );

		this.weaponType = weaponType;
		this.tweaker = 0.15; // value used to tweak the desirability

	}

	/**
	* Calculates the desirability. It's a score between 0 and 1 representing the desirability
	* of a goal.
	*
	* @param {Enemy} owner - The owner of this goal evaluator.
	* @return {Number} The desirability.
	*/
	calculateDesirability( owner ) {

		let desirability = 0;

		const ignoreFlag = ( this.weaponType === WEAPON_TYPES_SHOTGUN ) ? owner.ignoreShotgun : owner.ignoreAssaultRifle;

		if ( ignoreFlag === false ) {

			const distanceScore = Feature.distanceToItem( owner, this.weaponType );
			const weaponScore = Feature.individualWeaponStrength( owner, this.weaponType );
			const healthScore = Feature.health( owner );

			desirability = this.tweaker * ( 1 - weaponScore ) * healthScore / distanceScore;

			desirability = MathUtils.clamp( desirability, 0, 1 );

		}

		return desirability;

	}

	/**
	* Executed if this goal evaluator produces the highest desirability.
	*
	* @param {Enemy} owner - The owner of this goal evaluator.
	*/
	setGoal( owner ) {

		const currentSubgoal = owner.brain.currentSubgoal();

		if ( ( currentSubgoal instanceof GetItemGoal ) === false ) {

			owner.brain.clearSubgoals();

			owner.brain.addSubgoal( new GetItemGoal( owner, this.weaponType ) );

		}

	}

}

export { GetWeaponEvaluator };
