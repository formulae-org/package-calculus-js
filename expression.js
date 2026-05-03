/*
Fōrmulæ calculus package. Module for expression definition & visualization.
Copyright (C) 2015-2026 Laurence R. Ugalde

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

'use strict';

export class CalculusPackage extends Formulae.ExpressionPackage {};

const SIGN_GAP  = 0;  // px between ∫ sign right edge and integrand
const D_GAP     = 5;  // px between integrand and differential d
const LIMIT_GAP = 2;  // px between ∫ sign top/bottom and limits
const LIMIT_SIZE = -4; // font-size delta for limit subexpressions

// Path data from Wikipedia's integral SVG.
// Original viewBox: 0 0 52 75; <g> transform: translate(0,75) scale(0.1,-0.1)
// The path uses PostScript y-up coordinates; the transform is re-applied in drawIntegralSign.
const INTEGRAL_SIGN_PATH = new Path2D(
	"M342 648 c-24 -29 -49 -130 -87 -343 c-19 -107 -33 -155 -46 -155 " +
	"c-5 0 -8 3 -7 7 c2 5 0 9 -4 11 c-5 1 -8 0 -8 -3 c0 -3 0 -9 0 -15 " +
	"c0 -5 9 -10 20 -10 c32 0 48 47 90 262 c40 203 59 271 67 236 " +
	"c6 -23 26 -23 21 -1 c-4 22 -31 28 -46 11 z"
);

// Tight bounding box of the sign within the 52×75 SVG viewport.
// The path leaves large margins; these constants clip them so the sign
// fills the target box exactly.
const SIGN_SVG_X = 19;    // left edge of sign in SVG space
const SIGN_SVG_Y = 8;     // top edge of sign in SVG space
const SIGN_SVG_W = 21;    // width of sign in SVG space  (right edge ≈ 40)
const SIGN_SVG_H = 53;    // height of sign in SVG space (bottom edge ≈ 61)

// Renders the ∫ sign in a target box (x, y, w, h) using the current fillStyle.
// Applies both the tight-bounds clipping and the original <g> transform.
function drawIntegralSign(context, x, y, w, h) {
	context.save();
	context.translate(x, y);
	context.scale(w / SIGN_SVG_W, h / SIGN_SVG_H);
	context.translate(-SIGN_SVG_X, -SIGN_SVG_Y);
	context.translate(0, 75);
	context.scale(0.1, -0.1);
	context.fill(INTEGRAL_SIGN_PATH);
	context.restore();
}

// ─── Indefinite integral: ∫ f dx ────────────────────────────────────────────

const IndefiniteIntegral = class extends Expression.Function {
	getTag()                { return "Calculus.Integral.IndefiniteIntegral"; }
	getName()               { return CalculusPackage.messages.nameIndefiniteIntegral; }
	getMnemonic()           { return CalculusPackage.messages.mnemonicIntegral; }
	canHaveChildren(count)  { return count === 2; }
	getChildName(index)     { return CalculusPackage.messages.childrenIndefiniteIntegral[index]; }

	prepareDisplay(context) {
		this.heightSymbol = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol  = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);

		let ch0 = this.children[0]; // integrand
		let ch1 = this.children[1]; // variable
		ch0.prepareDisplay(context);
		ch1.prepareDisplay(context);

		this.dWidth = Math.ceil(context.measureText("d").width);

		// Vertical: center the ∫ sign at horzBaseline; accommodate both children
		this.horzBaseline = Math.max(
			Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline,
			ch1.horzBaseline
		);
		this.height = this.horzBaseline + Math.max(
			Math.ceil(this.heightSymbol / 2),
			ch0.height - ch0.horzBaseline,
			ch1.height - ch1.horzBaseline
		);

		// Horizontal: [∫] [SIGN_GAP] [integrand] [D_GAP] [d] [variable]
		ch0.x = this.widthSymbol + SIGN_GAP;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + D_GAP;

		ch1.x = this.dX + this.dWidth;
		ch1.y = this.horzBaseline - ch1.horzBaseline;

		this.width        = ch1.x + ch1.width;
		this.vertBaseline = Math.floor(this.width / 2);
	}

	display(context, x, y) {
		drawIntegralSign(
			context,
			x,
			y + this.horzBaseline - Math.floor(this.heightSymbol / 2),
			this.widthSymbol,
			this.heightSymbol
		);

		let ch0 = this.children[0];
		ch0.display(context, x + ch0.x, y + ch0.y);

		let bkpItalic = context.fontInfo.italic;
		context.fontInfo.setItalic(context, true);
		super.drawText(context, "d", x + this.dX, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
		context.fontInfo.setItalic(context, bkpItalic);

		let ch1 = this.children[1];
		ch1.display(context, x + ch1.x, y + ch1.y);
	}

	moveTo(direction) {
		return direction === Expression.NEXT
			? this.children[1].moveTo(direction)
			: this.children[0].moveTo(direction);
	}

	moveAcross(i, direction) {
		if (direction === Expression.NEXT     && i === 0) return this.children[1].moveTo(direction);
		if (direction === Expression.PREVIOUS && i === 1) return this.children[0].moveTo(direction);
		return this.moveOut(direction);
	}
};

// ─── Definite integral: ∫_a^b f dx ─────────────────────────────────────────

const DefiniteIntegral = class extends Expression.Function {
	getTag()                { return "Calculus.Integral.DefiniteIntegral"; }
	getName()               { return CalculusPackage.messages.nameDefiniteIntegral; }
	getMnemonic()           { return CalculusPackage.messages.mnemonicIntegral; }
	canHaveChildren(count)  { return count === 4; }
	getChildName(index)     { return CalculusPackage.messages.childrenDefiniteIntegral[index]; }

	prepareDisplay(context) {
		this.heightSymbol = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol  = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);

		let ch0 = this.children[0]; // integrand
		let ch1 = this.children[1]; // variable
		let ch2 = this.children[2]; // lower bound
		let ch3 = this.children[3]; // upper bound

		ch0.prepareDisplay(context);
		ch1.prepareDisplay(context);

		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
			ch2.prepareDisplay(context);
			ch3.prepareDisplay(context);
			context.fontInfo.setSizeAbsolute(context, bkp);
		}

		this.dWidth = Math.ceil(context.measureText("d").width);

		// Sign column is wide enough to center the sign, lower, and upper
		this.widthSignColumn = Math.max(this.widthSymbol, ch2.width, ch3.width);
		this.symbolX = Math.floor((this.widthSignColumn - this.widthSymbol) / 2);

		let spaceTop    = ch3.height + LIMIT_GAP;
		let spaceBottom = ch2.height + LIMIT_GAP;

		// Vertical: sign center at horzBaseline; must leave room for upper bound above
		this.horzBaseline = Math.max(
			spaceTop + Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline,
			ch1.horzBaseline
		);
		this.symbolY = this.horzBaseline - Math.floor(this.heightSymbol / 2);

		// Limits centered within sign column, tight against sign top/bottom
		ch3.x = Math.floor((this.widthSignColumn - ch3.width) / 2);
		ch3.y = this.symbolY - LIMIT_GAP - ch3.height;

		ch2.x = Math.floor((this.widthSignColumn - ch2.width) / 2);
		ch2.y = this.symbolY + this.heightSymbol + LIMIT_GAP;

		// Integrand and variable to the right of the sign column
		ch0.x = this.widthSignColumn + SIGN_GAP;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + D_GAP;

		ch1.x = this.dX + this.dWidth;
		ch1.y = this.horzBaseline - ch1.horzBaseline;

		this.width        = ch1.x + ch1.width;
		this.height = this.horzBaseline + Math.max(
			Math.ceil(this.heightSymbol / 2) + spaceBottom,
			ch0.height - ch0.horzBaseline,
			ch1.height - ch1.horzBaseline
		);
		this.vertBaseline = Math.floor(this.width / 2);
	}

	display(context, x, y) {
		drawIntegralSign(
			context,
			x + this.symbolX,
			y + this.symbolY,
			this.widthSymbol,
			this.heightSymbol
		);

		let ch0 = this.children[0];
		ch0.display(context, x + ch0.x, y + ch0.y);

		let bkpItalic = context.fontInfo.italic;
		context.fontInfo.setItalic(context, true);
		super.drawText(context, "d", x + this.dX, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
		context.fontInfo.setItalic(context, bkpItalic);

		let ch1 = this.children[1];
		ch1.display(context, x + ch1.x, y + ch1.y);

		let bkpSize = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);

		let ch2 = this.children[2];
		ch2.display(context, x + ch2.x, y + ch2.y);

		let ch3 = this.children[3];
		ch3.display(context, x + ch3.x, y + ch3.y);

		context.fontInfo.setSizeAbsolute(context, bkpSize);
	}

	moveTo(direction) {
		switch (direction) {
			case Expression.UP:   return this.children[3].moveTo(direction);
			case Expression.DOWN: return this.children[2].moveTo(direction);
			case Expression.NEXT: return this.children[1].moveTo(direction);
			default:              return this.children[0].moveTo(direction);
		}
	}

	moveAcross(i, direction) {
		switch (direction) {
			case Expression.NEXT:
				if (i === 0) return this.children[1].moveTo(direction);
				break;
			case Expression.PREVIOUS:
				if (i === 1) return this.children[0].moveTo(direction);
				break;
			case Expression.UP:
				if (i !== 3) return this.children[3].moveTo(direction);
				break;
			case Expression.DOWN:
				if (i === 3)             return this.children[0].moveTo(direction);
				if (i === 0 || i === 1)  return this.children[2].moveTo(direction);
				break;
		}
		return this.moveOut(direction);
	}
};

// ─── Definite integral over domain: ∫∫_D f dA ──────────────────────────────

const MULTI_SIGN_STEP = 0.80; // step between consecutive ∫ signs as a fraction of widthSymbol

const DefiniteIntegralOverDomain = class extends Expression.Function {
	getTag()                { return "Calculus.Integral.DefiniteIntegralOverDomain"; }
	getName()               { return CalculusPackage.messages.nameDefiniteIntegralOverDomain; }
	getMnemonic()           { return CalculusPackage.messages.mnemonicIntegral; }
	canHaveChildren(count)  { return count === 3; }
	getChildName(index)     { return CalculusPackage.messages.childrenDefiniteIntegralOverDomain[index]; }

	getSerializationNames() { return [ "Dimensions" ]; }
	async getSerializationStrings() { return [ String(this.dimensions) ]; }
	setSerializationStrings(strings, promises) { this.dimensions = parseInt(strings[0]); }

	prepareDisplay(context) {
		let dims = this.dimensions || 1;

		this.heightSymbol  = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol   = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);
		this.signStep      = Math.round(this.widthSymbol * MULTI_SIGN_STEP);
		this.signGroupWidth = this.widthSymbol + (dims - 1) * this.signStep;

		let ch0 = this.children[0]; // integrand
		let ch1 = this.children[1]; // domain
		let ch2 = this.children[2]; // differential element

		ch0.prepareDisplay(context);
		ch2.prepareDisplay(context);

		this.dWidth = Math.ceil(context.measureText("d").width);

		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
			ch1.prepareDisplay(context);
			context.fontInfo.setSizeAbsolute(context, bkp);
		}

		// Sign column: wide enough for sign group and domain label
		this.widthSignColumn = Math.max(this.signGroupWidth, ch1.width);
		this.symbolGroupX    = Math.floor((this.widthSignColumn - this.signGroupWidth) / 2);

		let spaceBottom = ch1.height + LIMIT_GAP;

		this.horzBaseline = Math.max(
			Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline,
			ch2.horzBaseline
		);
		this.symbolY = this.horzBaseline - Math.floor(this.heightSymbol / 2);

		ch1.x = Math.floor((this.widthSignColumn - ch1.width) / 2);
		ch1.y = this.symbolY + this.heightSymbol + LIMIT_GAP;

		ch0.x = this.widthSignColumn + SIGN_GAP;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + D_GAP;

		ch2.x = this.dX + this.dWidth;
		ch2.y = this.horzBaseline - ch2.horzBaseline;

		this.width        = ch2.x + ch2.width;
		this.height       = this.horzBaseline + Math.max(
			Math.ceil(this.heightSymbol / 2) + spaceBottom,
			ch0.height - ch0.horzBaseline,
			ch2.height - ch2.horzBaseline
		);
		this.vertBaseline = Math.floor(this.width / 2);
	}

	display(context, x, y) {
		let dims = this.dimensions || 1;
		for (let i = 0; i < dims; i++) {
			drawIntegralSign(
				context,
				x + this.symbolGroupX + i * this.signStep,
				y + this.symbolY,
				this.widthSymbol,
				this.heightSymbol
			);
		}

		let bkpSize = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		let ch1 = this.children[1];
		ch1.display(context, x + ch1.x, y + ch1.y);
		context.fontInfo.setSizeAbsolute(context, bkpSize);

		let ch0 = this.children[0];
		ch0.display(context, x + ch0.x, y + ch0.y);

		let bkpItalic = context.fontInfo.italic;
		context.fontInfo.setItalic(context, true);
		super.drawText(context, "d", x + this.dX, y + this.horzBaseline + Math.round(context.fontInfo.size / 2));
		context.fontInfo.setItalic(context, bkpItalic);

		let ch2 = this.children[2];
		ch2.display(context, x + ch2.x, y + ch2.y);
	}

	moveTo(direction) {
		switch (direction) {
			case Expression.DOWN: return this.children[1].moveTo(direction);
			case Expression.NEXT: return this.children[2].moveTo(direction);
			default:              return this.children[0].moveTo(direction);
		}
	}

	moveAcross(i, direction) {
		switch (direction) {
			case Expression.NEXT:
				if (i === 0) return this.children[2].moveTo(direction);
				break;
			case Expression.PREVIOUS:
				if (i === 2) return this.children[0].moveTo(direction);
				break;
			case Expression.DOWN:
				if (i === 0 || i === 2) return this.children[1].moveTo(direction);
				break;
			case Expression.UP:
				if (i === 1) return this.children[0].moveTo(direction);
				break;
		}
		return this.moveOut(direction);
	}
};

CalculusPackage.setExpressions = function(module) {
	Formulae.setExpression(module, "Calculus.Integral.IndefiniteIntegral",         IndefiniteIntegral);
	Formulae.setExpression(module, "Calculus.Integral.DefiniteIntegral",           DefiniteIntegral);
	Formulae.setExpression(module, "Calculus.Integral.DefiniteIntegralOverDomain", DefiniteIntegralOverDomain);
};

