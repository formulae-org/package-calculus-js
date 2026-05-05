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

const SIGN_GAP_FRAC               = 0.00;  // gap right of ∫ sign, as fraction of widthSymbol
const SIGN_GAP_FRAC_CLOSED_DOMAIN = 0.30;  // wider gap for closed-domain; the oval protrudes right of the sign column
const D_GAP_FRAC                  = 0.30;  // gap between integrand and differential d, as fraction of widthSymbol
const LIMIT_GAP_FRAC              = 0.08;  // gap between ∫ sign and limit expressions, as fraction of widthSymbol

const LIMIT_SIZE = -4; // font-size delta for limit subexpressions

const CIRCLE_CX_FRAC       = 0.45;   // oval center as fraction of widthSymbol from sign left edge
const CIRCLE_RADIUS_SINGLE = 0.30;   // r for dims=1, as fraction of widthSymbol
const CIRCLE_RADIUS_MULTI  = 0.35;   // r for dims≥2, as fraction of widthSymbol
const CIRCLE_STROKE_WIDTH  = 0.06;   // oval lineWidth as fraction of widthSymbol

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

// Draws a stadium (two semicircles joined by horizontal tangents) centered
// vertically at cy. For dims=1 the two centers coincide and it degenerates
// to a full circle. strokeStyle is set to match the current fillStyle so
// the oval color tracks selection highlights and theme changes.
function drawClosedIntegralOval(context, cx1, cy, cx2, r, lineWidth) {
	context.save();
	context.lineWidth   = lineWidth;
	context.strokeStyle = context.fillStyle;
	context.beginPath();
	context.arc(cx1, cy, r,  Math.PI / 2, -Math.PI / 2, false); // left semicircle
	context.lineTo(cx2, cy - r);                                  // top tangent
	context.arc(cx2, cy, r, -Math.PI / 2,  Math.PI / 2, false); // right semicircle
	context.closePath();                                           // bottom tangent
	context.stroke();
	context.restore();
}

// ─── Indefinite integral: ∫ f dx ────────────────────────────────────────────

const IndefiniteIntegral = class extends Expression {
	getTag()               { return "Calculus.Integral.IndefiniteIntegral"; }
	getName()              { return CalculusPackage.messages.nameIndefiniteIntegral; }
	canHaveChildren(count) { return count === 2; }
	getChildName(index)    { return CalculusPackage.messages.childrenIndefiniteIntegral[index]; }

	prepareDisplay(context) {
		this.heightSymbol = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol  = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);
		let signGap = Math.round(this.widthSymbol * SIGN_GAP_FRAC);
		let dGap    = Math.round(this.widthSymbol * D_GAP_FRAC);

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

		// Horizontal: [∫] [signGap] [integrand] [dGap] [d] [variable]
		ch0.x = this.widthSymbol + signGap;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + dGap;

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

	moveAcross(i, direction) {
		if (direction === Expression.NEXT     && i === 0) return this.children[1].moveTo(direction);
		if (direction === Expression.PREVIOUS && i === 1) return this.children[0].moveTo(direction);
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		return direction === Expression.PREVIOUS
			? this.children[1].moveTo(direction)
			: this.children[0].moveTo(direction);
	}
};

// ─── Definite integral: ∫_a^b f dx ─────────────────────────────────────────

const DefiniteIntegral = class extends Expression {
	getTag()                { return "Calculus.Integral.DefiniteIntegral"; }
	getName()               { return CalculusPackage.messages.nameDefiniteIntegral; }
	canHaveChildren(count)  { return count === 4; }
	getChildName(index)     { return CalculusPackage.messages.childrenDefiniteIntegral[index]; }

	prepareDisplay(context) {
		this.heightSymbol = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol  = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);
		let signGap  = Math.round(this.widthSymbol * SIGN_GAP_FRAC);
		let dGap     = Math.round(this.widthSymbol * D_GAP_FRAC);
		let limitGap = Math.round(this.widthSymbol * LIMIT_GAP_FRAC);

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

		let spaceTop    = ch3.height + limitGap;
		let spaceBottom = ch2.height + limitGap;

		// Vertical: sign center at horzBaseline; must leave room for upper bound above
		this.horzBaseline = Math.max(
			spaceTop + Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline,
			ch1.horzBaseline
		);
		this.symbolY = this.horzBaseline - Math.floor(this.heightSymbol / 2);

		// Limits centered within sign column, tight against sign top/bottom
		ch3.x = Math.floor((this.widthSignColumn - ch3.width) / 2);
		ch3.y = this.symbolY - limitGap - ch3.height;

		ch2.x = Math.floor((this.widthSignColumn - ch2.width) / 2);
		ch2.y = this.symbolY + this.heightSymbol + limitGap;

		// Integrand and variable to the right of the sign column
		ch0.x = this.widthSignColumn + signGap;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + dGap;

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

	moveAcross(i, direction) {
		switch (direction) {
			case Expression.NEXT:
				if (i === 0) return this.children[1].moveTo(direction);
				if (i === 2 || i === 3) return this.children[0].moveTo(direction);
				break;
			
			case Expression.PREVIOUS:
				if (i === 1) return this.children[0].moveTo(direction);
				break;
			
			case Expression.UP:
				if (i === 0 || i === 1) return this.children[3].moveTo(direction);
				if (i === 2)            return this.children[0].moveTo(direction);
				break;
			
			case Expression.DOWN:
				if (i === 0 || i === 1) return this.children[2].moveTo(direction);
				if (i === 3)            return this.children[0].moveTo(direction);
				break;
		}
		
		return this.moveOut(direction);
	}
	
	moveTo(direction) {
		switch (direction) {
			case Expression.UP:       return this.children[2].moveTo(direction);
			case Expression.DOWN:     return this.children[3].moveTo(direction);
			case Expression.PREVIOUS: return this.children[1].moveTo(direction);
			default:                  return this.children[0].moveTo(direction);
		}
	}
};

// ─── Definite integral over domain: ∫∫_D f dA ──────────────────────────────

const MULTI_SIGN_STEP = 0.80; // < 1.0 so consecutive ∫ signs overlap slightly, giving the stacked-integral look

const DefiniteIntegralOverDomain = class extends Expression {
	getTag()                { return "Calculus.Integral.DefiniteIntegralOverDomain"; }
	getName()               { return CalculusPackage.messages.nameDefiniteIntegralOverDomain; }
	canHaveChildren(count)  { return count === 3; }
	getChildName(index)     { return CalculusPackage.messages.childrenDefiniteIntegralOverDomain[index]; }

	getSerializationNames() { return [ "Dimensions", "ClosedDomain" ]; }
	async getSerializationStrings() { return [ String(this.dimensions), this.closedDomain ? "True" : "False" ]; }
	setSerializationStrings(strings, promises) { this.dimensions = parseInt(strings[0]); this.closedDomain = strings[1] === "True"; }

	prepareDisplay(context) {
		let dims = this.dimensions || 1;

		this.heightSymbol  = Math.floor(context.fontInfo.size * 3);
		this.widthSymbol   = Math.round(this.heightSymbol * SIGN_SVG_W / SIGN_SVG_H);
		this.signStep      = Math.round(this.widthSymbol * MULTI_SIGN_STEP);
		this.signGroupWidth = this.widthSymbol + (dims - 1) * this.signStep;
		let signGap  = Math.round(this.widthSymbol * (this.closedDomain ? SIGN_GAP_FRAC_CLOSED_DOMAIN : SIGN_GAP_FRAC));
		let dGap     = Math.round(this.widthSymbol * D_GAP_FRAC);
		let limitGap = Math.round(this.widthSymbol * LIMIT_GAP_FRAC);

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

		let spaceBottom = ch1.height + limitGap;

		this.horzBaseline = Math.max(
			Math.floor(this.heightSymbol / 2),
			ch0.horzBaseline,
			ch2.horzBaseline
		);
		this.symbolY = this.horzBaseline - Math.floor(this.heightSymbol / 2);

		ch1.x = Math.floor((this.widthSignColumn - ch1.width) / 2);
		ch1.y = this.symbolY + this.heightSymbol + limitGap;

		ch0.x = this.widthSignColumn + signGap;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		this.dX = ch0.x + ch0.width + dGap;

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

		if (this.closedDomain) {
			let rFrac = dims === 1 ? CIRCLE_RADIUS_SINGLE : CIRCLE_RADIUS_MULTI;
			let r     = Math.round(this.widthSymbol * rFrac);
			let cxOff = Math.round(this.widthSymbol * CIRCLE_CX_FRAC);
			drawClosedIntegralOval(
				context,
				x + this.symbolGroupX + cxOff,
				y + this.horzBaseline,
				x + this.symbolGroupX + (dims - 1) * this.signStep + cxOff,
				r,
				Math.max(1, Math.round(this.widthSymbol * CIRCLE_STROKE_WIDTH))
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

	moveAcross(i, direction) {
		switch (direction) {
			case Expression.NEXT:
				if (i === 0) return this.children[2].moveTo(direction);
				if (i === 1) return this.children[0].moveTo(direction);
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
	
	moveTo(direction) {
		switch (direction) {
			case Expression.UP:       return this.children[1].moveTo(direction);
			case Expression.PREVIOUS: return this.children[2].moveTo(direction);
			default:                  return this.children[0].moveTo(direction);
		}
	}
};

// ─── Limit: lim, lim inf, lim sup ───────────────────────────────────────────

const WORD_GAP_FRAC = 0.10; // gap below word to subscript, as fraction of fontSize
const EXPR_GAP_FRAC = 0.20; // gap right of sign column to expression, as fraction of fontSize

const LimitBase = class extends Expression {
	getWord()              { return "lim"; }
	canHaveChildren(count) { return count === 3; }
	getChildName(index)    { return CalculusPackage.messages.childrenLimit[index]; }

	getSerializationNames()         { return [ "ApproachDirection" ]; }
	async getSerializationStrings() { return [ this.approachDirection || "Both" ]; }
	setSerializationStrings(strings, promises) {
		this.approachDirection = strings[0] || "Both";
	}

	prepareDisplay(context) {
		let dir = this.approachDirection || "Both";
		this.approachChar = dir === "Left" ? "⁻" : dir === "Right" ? "⁺" : "";

		let ch0 = this.children[0]; // expression
		let ch1 = this.children[1]; // variable
		let ch2 = this.children[2]; // limit point

		ch0.prepareDisplay(context);

		let fontSize = context.fontInfo.size;
		this.wordWidth = Math.ceil(context.measureText(this.getWord()).width);

		let subArrowWidth, subApproachWidth, subBaseline;
		{
			let bkp = context.fontInfo.size;
			context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
			ch1.prepareDisplay(context);
			ch2.prepareDisplay(context);
			subArrowWidth    = Math.ceil(context.measureText("→").width);
			subApproachWidth = this.approachChar
				? Math.ceil(context.measureText(this.approachChar).width) : 0;
			subBaseline = Math.max(ch1.horzBaseline, ch2.horzBaseline);
			context.fontInfo.setSizeAbsolute(context, bkp);
		}

		this.subArrowWidth = subArrowWidth;
		this.subBaseline   = subBaseline;

		let subWidth = ch1.width + subArrowWidth + ch2.width + subApproachWidth;

		// Sign column: wide enough to hold both the word and the subscript
		this.signColumnWidth = Math.max(this.wordWidth, subWidth);
		this.wordX           = Math.floor((this.signColumnWidth - this.wordWidth) / 2);
		let subLeft          = Math.floor((this.signColumnWidth - subWidth) / 2);

		let wordGap = Math.round(fontSize * WORD_GAP_FRAC);
		let exprGap = Math.round(fontSize * EXPR_GAP_FRAC);

		// Vertical: word baseline at horzBaseline; subscript hangs below
		this.horzBaseline = Math.max(Math.floor(fontSize / 2), ch0.horzBaseline);
		this.subY         = this.horzBaseline + Math.ceil(fontSize / 2) + wordGap;

		// Subscript children (baseline-aligned within subscript area)
		ch1.x = subLeft;
		ch1.y = this.subY + (subBaseline - ch1.horzBaseline);

		this.arrowX = subLeft + ch1.width;

		ch2.x = this.arrowX + subArrowWidth;
		ch2.y = this.subY + (subBaseline - ch2.horzBaseline);

		this.approachCharX = ch2.x + ch2.width;

		// Expression to the right of the sign column
		ch0.x = this.signColumnWidth + exprGap;
		ch0.y = this.horzBaseline - ch0.horzBaseline;

		let subHeight = subBaseline + Math.max(
			ch1.height - ch1.horzBaseline,
			ch2.height - ch2.horzBaseline
		);
		this.width        = ch0.x + ch0.width;
		this.height       = Math.max(
			this.subY + subHeight,
			this.horzBaseline + (ch0.height - ch0.horzBaseline)
		);
		this.vertBaseline = Math.floor(this.width / 2);
	}

	display(context, x, y) {
		super.drawText(context, this.getWord(),
			x + this.wordX,
			y + this.horzBaseline + Math.round(context.fontInfo.size / 2)
		);

		let bkpSize = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);

		let subTextY = y + this.subY + this.subBaseline + Math.round(context.fontInfo.size / 2);

		let ch1 = this.children[1]; // variable
		ch1.display(context, x + ch1.x, y + ch1.y);

		super.drawText(context, "→", x + this.arrowX, subTextY);

		let ch2 = this.children[2]; // limit point
		ch2.display(context, x + ch2.x, y + ch2.y);

		if (this.approachChar) {
			super.drawText(context, this.approachChar, x + this.approachCharX, subTextY);
		}

		context.fontInfo.setSizeAbsolute(context, bkpSize);

		let ch0 = this.children[0]; // expression
		ch0.display(context, x + ch0.x, y + ch0.y);
	}

	moveTo(direction) {
		// PREVIOUS enters from right → expression (rightmost); all others → variable (leftmost)
		return (direction === Expression.PREVIOUS)
			? this.children[0].moveTo(direction)
			: this.children[1].moveTo(direction);
	}

	moveAcross(i, direction) {
		switch (direction) {
			case Expression.NEXT:
				if (i === 1) return this.children[2].moveTo(direction); // variable → limit point
				if (i === 2) return this.children[0].moveTo(direction); // limit point → expression
				break;
			case Expression.PREVIOUS:
				if (i === 0) return this.children[2].moveTo(direction); // expression → limit point
				if (i === 2) return this.children[1].moveTo(direction); // limit point → variable
				break;
			case Expression.DOWN:
				if (i === 0) return this.children[1].moveTo(direction); // expression → subscript
				break;
			case Expression.UP:
				if (i === 1 || i === 2) return this.children[0].moveTo(direction); // subscript → expression
				break;
		}
		return this.moveOut(direction);
	}
};

const Limit = class extends LimitBase {
	getTag()  { return "Calculus.Limit.Limit"; }
	getName() { return CalculusPackage.messages.nameLimit; }
};

const LimitInferior = class extends LimitBase {
	getTag()  { return "Calculus.Limit.LimitInferior"; }
	getName() { return CalculusPackage.messages.nameLimitInferior; }
	getWord() { return "lim inf"; }
};

const LimitSuperior = class extends LimitBase {
	getTag()  { return "Calculus.Limit.LimitSuperior"; }
	getName() { return CalculusPackage.messages.nameLimitSuperior; }
	getWord() { return "lim sup"; }
};

// ─── Differential: TotalDerivative, TotalDerivativeWithoutVariables, PartialDerivative ──

const TYPE_TOTAL_LEIBNIZ_QUOTIENT  = 1;
const TYPE_TOTAL_LEIBNIZ_OPERATOR  = 2;
const TYPE_TOTAL_EULER             = 3;
const TYPE_TOTAL_SUBSCRIPT         = 4;

const TYPE_TOTAL_NOVAR_LAGRANGE = 1;
const TYPE_TOTAL_NOVAR_NEWTON   = 2;

const TYPE_PARTIAL_LEIBNIZ_QUOTIENT  = 1;
const TYPE_PARTIAL_LEIBNIZ_OPERATOR  = 2;

CalculusPackage.styleTotal                 = TYPE_TOTAL_LEIBNIZ_OPERATOR;
CalculusPackage.styleTotalWithoutVariables = TYPE_TOTAL_NOVAR_LAGRANGE;
CalculusPackage.stylePartial               = TYPE_PARTIAL_LEIBNIZ_OPERATOR;

const LQ_FUNC_GAP_FRAC     = 0.10; // gap between d^n (or ∂^n) and the function in the quotient numerator, as fraction of fontSize
const LO_FUNC_GAP_FRAC     = 0.20; // gap between the operator fraction and the function to its right, as fraction of fontSize
const LEIBNIZ_DEN_GAP_FRAC = 0.15; // gap between d·var groups in the Leibniz denominator, as fraction of fontSize

function derivativeOrder(expression) {
	let total = 0;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		if (
			ch.getTag() === "Math.Arithmetic.Exponentiation" &&
			ch.children.length === 2 &&
			ch.children[1].getTag() === "Math.Number"
		) {
			let n = parseInt(ch.children[1].get("Value"));
			total += (Number.isInteger(n) && n >= 2) ? n : 1;
		} else {
			total += 1;
		}
	}
	return total;
}

function prepareDisplayLeibnizQuotient(expression, context, total) {
	const fontSize        = context.fontInfo.size;
	const symHorzBaseline = Math.round(fontSize / 2);
	const sym             = total ? "d" : "∂";
	const order           = derivativeOrder(expression);
	const symWidth        = Math.ceil(context.measureText(sym).width);

	let ordWidth = 0, ordHorzBaseline = 0;
	if (order > 1) {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		ordWidth        = Math.ceil(context.measureText(String(order)).width);
		ordHorzBaseline = Math.round(context.fontInfo.size / 2);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);
	for (let i = 1; i < expression.children.length; i++) {
		expression.children[i].prepareDisplay(context);
	}

	// Numerator: [sym^order] [ch0], aligned at horzBaseline
	// d^n block uses Superscript layout; ordHorzBaseline=0 when order≤1 so formula is uniform
	const dnHorzBaseline  = ordHorzBaseline + symHorzBaseline;
	const numHorzBaseline = Math.max(dnHorzBaseline, ch0.horzBaseline);
	const numHeight       = numHorzBaseline + Math.max(
		fontSize - symHorzBaseline,
		ch0.height - ch0.horzBaseline
	);
	const funcGap  = Math.round(fontSize * LQ_FUNC_GAP_FRAC);
	const numWidth = symWidth + ordWidth + funcGap + ch0.width;

	// Denominator: [sym var₁] [gap] [sym var₂] …
	const denGap = Math.round(fontSize * LEIBNIZ_DEN_GAP_FRAC);
	let denHorzBaseline = symHorzBaseline;
	let denHeightBelow  = fontSize - symHorzBaseline;
	let denWidth = 0;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		if (i > 1) denWidth += denGap;
		denWidth        += symWidth + ch.width;
		denHorzBaseline  = Math.max(denHorzBaseline, ch.horzBaseline);
		denHeightBelow   = Math.max(denHeightBelow, ch.height - ch.horzBaseline);
	}
	const denHeight = denHorzBaseline + denHeightBelow;

	// Fraction (Division class pattern)
	const fracWidth        = 3 + Math.max(numWidth, denWidth) + 3;
	const fracVertBaseline = Math.round(fracWidth / 2);
	const numX             = fracVertBaseline - Math.round(numWidth / 2);
	const denX             = fracVertBaseline - Math.round(denWidth / 2);
	const denY             = numHeight + 3;

	// Child positions (numY = 0)
	ch0.x = numX + symWidth + ordWidth + funcGap;
	ch0.y = numHorzBaseline - ch0.horzBaseline;

	let curX = 0;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		if (i > 1) curX += denGap;
		ch.x = denX + curX + symWidth;
		ch.y = denY + denHorzBaseline - ch.horzBaseline;
		curX += symWidth + ch.width;
	}

	// Display data
	expression.lqSym         = sym;
	expression.lqOrder       = order;
	expression.lqNumSymX     = numX;
	expression.lqNumSymTextY = numHorzBaseline + Math.round(fontSize / 2);
	if (order > 1) {
		expression.lqNumOrdX     = numX + symWidth;
		expression.lqNumOrdTextY = (numHorzBaseline - symHorzBaseline) + ordHorzBaseline;
	}
	expression.lqDenSymTextY = denY + denHorzBaseline + Math.round(fontSize / 2);
	expression.lqDenSymXs    = [];
	curX = 0;
	for (let i = 1; i < expression.children.length; i++) {
		if (i > 1) curX += denGap;
		expression.lqDenSymXs.push(denX + curX);
		curX += symWidth + expression.children[i].width;
	}

	expression.width        = fracWidth;
	expression.height       = numHeight + 3 + denHeight;
	expression.horzBaseline = numHeight + 2;
	expression.vertBaseline = fracVertBaseline;
}

function displayLeibnizQuotient(expression, context, x, y, total) {
	// Fraction bar
	context.beginPath();
	context.moveTo(x,                    y - 0.5 + expression.horzBaseline);
	context.lineTo(x + expression.width, y - 0.5 + expression.horzBaseline);
	context.stroke();

	// Numerator sym (italic d or ∂)
	let bkpItalic = context.fontInfo.italic;
	context.fontInfo.setItalic(context, true);
	expression.drawText(context, expression.lqSym,
		x + expression.lqNumSymX,
		y + expression.lqNumSymTextY
	);
	context.fontInfo.setItalic(context, bkpItalic);

	// Order superscript
	if (expression.lqOrder > 1) {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		expression.drawText(context, String(expression.lqOrder),
			x + expression.lqNumOrdX,
			y + expression.lqNumOrdTextY
		);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	// Function child
	let ch0 = expression.children[0];
	ch0.display(context, x + ch0.x, y + ch0.y);

	// Denominator: italic sym then variable child, for each variable
	for (let i = 1; i < expression.children.length; i++) {
		bkpItalic = context.fontInfo.italic;
		context.fontInfo.setItalic(context, true);
		expression.drawText(context, expression.lqSym,
			x + expression.lqDenSymXs[i - 1],
			y + expression.lqDenSymTextY
		);
		context.fontInfo.setItalic(context, bkpItalic);

		let ch = expression.children[i];
		ch.display(context, x + ch.x, y + ch.y);
	}
}

function prepareDisplayLeibnizOperator(expression, context, total) {
	const fontSize        = context.fontInfo.size;
	const symHorzBaseline = Math.round(fontSize / 2);
	const sym             = total ? "d" : "∂";
	const order           = derivativeOrder(expression);
	const symWidth        = Math.ceil(context.measureText(sym).width);

	let ordWidth = 0, ordHorzBaseline = 0;
	if (order > 1) {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		ordWidth        = Math.ceil(context.measureText(String(order)).width);
		ordHorzBaseline = Math.round(context.fontInfo.size / 2);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);
	for (let i = 1; i < expression.children.length; i++) {
		expression.children[i].prepareDisplay(context);
	}

	// Numerator: d^n only (no function)
	const dnHorzBaseline  = ordHorzBaseline + symHorzBaseline;
	const numHorzBaseline = dnHorzBaseline;
	const numHeight       = numHorzBaseline + (fontSize - symHorzBaseline);
	const numWidth        = symWidth + ordWidth;

	// Denominator: [sym var₁] [gap] [sym var₂] …
	const denGap = Math.round(fontSize * LEIBNIZ_DEN_GAP_FRAC);
	let denHorzBaseline = symHorzBaseline;
	let denHeightBelow  = fontSize - symHorzBaseline;
	let denWidth = 0;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		if (i > 1) denWidth += denGap;
		denWidth        += symWidth + ch.width;
		denHorzBaseline  = Math.max(denHorzBaseline, ch.horzBaseline);
		denHeightBelow   = Math.max(denHeightBelow, ch.height - ch.horzBaseline);
	}
	const denHeight = denHorzBaseline + denHeightBelow;

	// Fraction (Division class pattern)
	const fracWidth        = 3 + Math.max(numWidth, denWidth) + 3;
	const fracVertBaseline = Math.round(fracWidth / 2);
	const numX             = fracVertBaseline - Math.round(numWidth / 2);
	const denX             = fracVertBaseline - Math.round(denWidth / 2);
	const denY             = numHeight + 3;
	const fracHorzBaseline = numHeight + 2;
	const fracHeight       = numHeight + 3 + denHeight;

	// Function to the right of the fraction
	const operatorGap = Math.round(fontSize * LO_FUNC_GAP_FRAC);
	ch0.x = fracWidth + operatorGap;
	ch0.y = fracHorzBaseline - ch0.horzBaseline;

	// Variable children in denominator
	let curX = 0;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		if (i > 1) curX += denGap;
		ch.x = denX + curX + symWidth;
		ch.y = denY + denHorzBaseline - ch.horzBaseline;
		curX += symWidth + ch.width;
	}

	// Display data
	expression.loSym         = sym;
	expression.loOrder       = order;
	expression.loFracWidth   = fracWidth;
	expression.loNumSymX     = numX;
	expression.loNumSymTextY = numHorzBaseline + Math.round(fontSize / 2);
	if (order > 1) {
		expression.loNumOrdX     = numX + symWidth;
		expression.loNumOrdTextY = (numHorzBaseline - symHorzBaseline) + ordHorzBaseline;
	}
	expression.loDenSymTextY = denY + denHorzBaseline + Math.round(fontSize / 2);
	expression.loDenSymXs    = [];
	curX = 0;
	for (let i = 1; i < expression.children.length; i++) {
		if (i > 1) curX += denGap;
		expression.loDenSymXs.push(denX + curX);
		curX += symWidth + expression.children[i].width;
	}

	expression.width        = fracWidth + operatorGap + ch0.width;
	expression.horzBaseline = fracHorzBaseline;
	expression.height       = Math.max(fracHeight, fracHorzBaseline + (ch0.height - ch0.horzBaseline));
	expression.vertBaseline = Math.round(expression.width / 2);
}

function displayLeibnizOperator(expression, context, x, y, total) {
	// Fraction bar — spans only the fraction, not the full expression
	context.beginPath();
	context.moveTo(x,                          y - 0.5 + expression.horzBaseline);
	context.lineTo(x + expression.loFracWidth, y - 0.5 + expression.horzBaseline);
	context.stroke();

	// Numerator sym (italic d or ∂)
	let bkpItalic = context.fontInfo.italic;
	context.fontInfo.setItalic(context, true);
	expression.drawText(context, expression.loSym,
		x + expression.loNumSymX,
		y + expression.loNumSymTextY
	);
	context.fontInfo.setItalic(context, bkpItalic);

	// Order superscript
	if (expression.loOrder > 1) {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		expression.drawText(context, String(expression.loOrder),
			x + expression.loNumOrdX,
			y + expression.loNumOrdTextY
		);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	// Denominator: italic sym + variable child, for each variable
	for (let i = 1; i < expression.children.length; i++) {
		bkpItalic = context.fontInfo.italic;
		context.fontInfo.setItalic(context, true);
		expression.drawText(context, expression.loSym,
			x + expression.loDenSymXs[i - 1],
			y + expression.loDenSymTextY
		);
		context.fontInfo.setItalic(context, bkpItalic);

		let ch = expression.children[i];
		ch.display(context, x + ch.x, y + ch.y);
	}

	// Function to the right of the fraction
	let ch0 = expression.children[0];
	ch0.display(context, x + ch0.x, y + ch0.y);
}

function prepareDisplayEuler(expression, context) {
	const fontSize      = context.fontInfo.size;
	const dHorzBaseline = Math.round(fontSize / 2);
	const dWidth        = Math.ceil(context.measureText("D").width);
	const order         = derivativeOrder(expression);

	let ordWidth = 0, ordHorzBaseline_sm = 0, smallFontSize = 0;
	if (order > 1) {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		smallFontSize      = context.fontInfo.size;
		ordWidth           = Math.ceil(context.measureText(String(order)).width);
		ordHorzBaseline_sm = Math.round(smallFontSize / 2);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);

	let subWidth = 0, subHorzBaseline = 0, subHeightBelow = 0;
	{
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		for (let i = 1; i < expression.children.length; i++) {
			expression.children[i].prepareDisplay(context);
		}
		for (let i = 1; i < expression.children.length; i++) {
			let ch = expression.children[i];
			subWidth        += ch.width;
			subHorzBaseline  = Math.max(subHorzBaseline, ch.horzBaseline);
			subHeightBelow   = Math.max(subHeightBelow, ch.height - ch.horzBaseline);
		}
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	// ordHorzBaseline_sm = 0 when order ≤ 1, so this formula is uniform
	const signHorzBaseline  = ordHorzBaseline_sm + dHorzBaseline;
	const exprGap           = Math.round(fontSize * EXPR_GAP_FRAC);
	expression.horzBaseline = Math.max(signHorzBaseline, ch0.horzBaseline);
	const signOffset        = expression.horzBaseline - signHorzBaseline;

	// Subscript y: standard Subscript-class formula (sub center at D's bottom)
	const subY = expression.horzBaseline - dHorzBaseline + fontSize - subHorzBaseline;

	// child positions
	const signColumnWidth = dWidth + Math.max(ordWidth, subWidth);
	ch0.x = signColumnWidth + exprGap;
	ch0.y = expression.horzBaseline - ch0.horzBaseline;

	let curSubX = dWidth;
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		ch.x = curSubX;
		ch.y = subY + (subHorzBaseline - ch.horzBaseline);
		curSubX += ch.width;
	}

	// display data
	expression.euOrder    = order;
	expression.euDTextY   = expression.horzBaseline + Math.round(fontSize / 2);
	expression.euOrdX     = dWidth;
	expression.euOrdTextY = signOffset + ordHorzBaseline_sm + Math.round(smallFontSize / 2);

	expression.width        = ch0.x + ch0.width;
	expression.height       = Math.max(
		expression.horzBaseline - dHorzBaseline + fontSize + subHeightBelow,
		expression.horzBaseline + (ch0.height - ch0.horzBaseline)
	);
	expression.vertBaseline = Math.round(expression.width / 2);
}

function displayEuler(expression, context, x, y) {
	// D (capital, upright — no italic override)
	expression.drawText(context, "D", x, y + expression.euDTextY);

	// Superscript order + subscript variable children, both at LIMIT_SIZE
	let bkp = context.fontInfo.size;
	context.fontInfo.setSizeRelative(context, LIMIT_SIZE);

	if (expression.euOrder > 1) {
		expression.drawText(context, String(expression.euOrder),
			x + expression.euOrdX,
			y + expression.euOrdTextY
		);
	}
	for (let i = 1; i < expression.children.length; i++) {
		let ch = expression.children[i];
		ch.display(context, x + ch.x, y + ch.y);
	}

	context.fontInfo.setSizeAbsolute(context, bkp);

	// Function child at full font size
	let ch0 = expression.children[0];
	ch0.display(context, x + ch0.x, y + ch0.y);
}

function prepareDisplaySubscript(expression, context) {
	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);

	const parens = ch0.parenthesesAsOperator() || ch0.parenthesesWhenSuperSubscripted();
	ch0.x = parens ? 4 : 0;
	ch0.y = 0;

	const subStartX = ch0.x + ch0.width + (parens ? 4 : 0) + 2;

	const items = [];
	let subHorzBaseline = 0, subHeightBelow = 0;
	{
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);

		for (let i = 1; i < expression.children.length; i++) {
			let ch = expression.children[i];
			let sub, repeat;
			let isExp = (
				ch.getTag() === "Math.Arithmetic.Exponentiation" &&
				ch.children.length === 2 &&
				ch.children[1].getTag() === "Math.Number"
			);
			if (isExp) {
				let n = parseInt(ch.children[1].get("Value"));
				if (Number.isInteger(n) && n >= 2) {
					sub = ch.children[0];
					repeat = n;
				} else {
					isExp = false;
				}
			}
			if (!isExp) { sub = ch; repeat = 1; }

			sub.prepareDisplay(context);
			subHorzBaseline = Math.max(subHorzBaseline, sub.horzBaseline);
			subHeightBelow  = Math.max(subHeightBelow, sub.height - sub.horzBaseline);
			for (let k = 0; k < repeat; k++) items.push(sub);
		}

		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	const subY = (ch0.height >= subHorzBaseline)
		? ch0.height - subHorzBaseline
		: ch0.horzBaseline;

	let curX = 0;
	const sbItems = items.map(sub => {
		const pos = { expr: sub, xOffset: subStartX + curX, yOffset: subY + (subHorzBaseline - sub.horzBaseline) };
		curX += sub.width;
		return pos;
	});

	expression.sbParens     = parens;
	expression.sbItems      = sbItems;
	expression.width        = subStartX + curX;
	expression.height       = Math.max(ch0.height, subY + subHorzBaseline + subHeightBelow);
	expression.horzBaseline = ch0.horzBaseline;
	expression.vertBaseline = ch0.x + ch0.vertBaseline;
}

function displaySubscript(expression, context, x, y) {
	let ch0 = expression.children[0];

	if (expression.sbParens) {
		ch0.drawParenthesesAround(context, x + ch0.x, y + ch0.y);
	}
	ch0.display(context, x + ch0.x, y + ch0.y);

	let bkp = context.fontInfo.size;
	context.fontInfo.setSizeRelative(context, LIMIT_SIZE);

	for (const { expr, xOffset, yOffset } of expression.sbItems) {
		expr.display(context, x + xOffset, y + yOffset);
	}

	context.fontInfo.setSizeAbsolute(context, bkp);
}

function prepareDisplayLagrange(expression, context) {
	const order = expression.order;
	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);

	if (order === 0) {
		ch0.x = ch0.y = 0;
		expression.width        = ch0.width;
		expression.height       = ch0.height;
		expression.horzBaseline = ch0.horzBaseline;
		expression.vertBaseline = ch0.vertBaseline;
		expression.lgMark       = "";
		expression.lgParens     = false;
		return;
	}

	const mark = order === 1 ? "′" : order === 2 ? "″" : order === 3 ? "‴" : "(" + order + ")";

	let markWidth, smallFontSize;
	{
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		smallFontSize = context.fontInfo.size;
		markWidth = Math.ceil(context.measureText(mark).width);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}

	const markHorzBaseline = Math.round(smallFontSize / 2);
	const parens = ch0.parenthesesAsOperator() || ch0.parenthesesWhenSuperSubscripted();

	ch0.x = parens ? 4 : 0;
	ch0.y = markHorzBaseline;

	const markX = ch0.x + ch0.width + (parens ? 4 : 0) + 2;

	expression.width        = markX + markWidth;
	expression.height       = markHorzBaseline + ch0.height;
	expression.horzBaseline = markHorzBaseline + ch0.horzBaseline;
	expression.vertBaseline = ch0.x + ch0.vertBaseline;

	expression.lgMark      = mark;
	expression.lgMarkX     = markX;
	expression.lgMarkTextY = markHorzBaseline + Math.round(smallFontSize / 2);
	expression.lgParens    = parens;
}

function displayLagrange(expression, context, x, y) {
	let ch0 = expression.children[0];

	if (expression.lgParens) {
		ch0.drawParenthesesAround(context, x + ch0.x, y + ch0.y);
	}
	ch0.display(context, x + ch0.x, y + ch0.y);

	if (expression.lgMark !== "") {
		let bkp = context.fontInfo.size;
		context.fontInfo.setSizeRelative(context, LIMIT_SIZE);
		expression.drawText(context, expression.lgMark, x + expression.lgMarkX, y + expression.lgMarkTextY);
		context.fontInfo.setSizeAbsolute(context, bkp);
	}
}

function prepareDisplayNewton(expression, context) {
	const order = expression.order;

	if (order === 0 || order >= 4) {
		prepareDisplayLagrange(expression, context);
		expression.ntMode = "mark";
		return;
	}

	expression.ntMode = "dots";

	const fontSize   = context.fontInfo.size;
	const dotRadius  = Math.max(1, Math.round(fontSize * 0.08));
	const dotSpacing = 2 * dotRadius + 2;

	let ch0 = expression.children[0];
	ch0.prepareDisplay(context);

	const parens    = ch0.parenthesesAsOperator() || ch0.parenthesesWhenSuperSubscripted();
	const bodyWidth = ch0.width + (parens ? 8 : 0);
	const dotClusterWidth = (order - 1) * dotSpacing + 2 * dotRadius;
	const expressionWidth = Math.max(bodyWidth, dotClusterWidth);
	const midX      = Math.round(expressionWidth / 2);

	ch0.x = Math.round((expressionWidth - bodyWidth) / 2) + (parens ? 4 : 0);
	ch0.y = 2 * dotRadius + 2;

	const ntDotCenters = [];
	const startX = midX - Math.floor((order - 1) * dotSpacing / 2);
	for (let i = 0; i < order; i++) ntDotCenters.push(startX + i * dotSpacing);

	expression.width        = expressionWidth;
	expression.height       = ch0.y + ch0.height;
	expression.horzBaseline = ch0.y + ch0.horzBaseline;
	expression.vertBaseline = ch0.x + ch0.vertBaseline;

	expression.ntDotRadius  = dotRadius;
	expression.ntDotCenterY = dotRadius + 1;
	expression.ntDotCenters = ntDotCenters;
	expression.ntParens     = parens;
}

function displayNewton(expression, context, x, y) {
	if (expression.ntMode !== "dots") {
		displayLagrange(expression, context, x, y);
		return;
	}

	let ch0 = expression.children[0];

	if (expression.ntParens) {
		ch0.drawParenthesesAround(context, x + ch0.x, y + ch0.y);
	}
	ch0.display(context, x + ch0.x, y + ch0.y);

	const dotY = y + expression.ntDotCenterY;
	for (const dotX of expression.ntDotCenters) {
		context.beginPath();
		context.arc(x + dotX, dotY, expression.ntDotRadius, 0, 2 * Math.PI);
		context.fill();
	}
}

const TotalDerivative = class extends Expression {
	getTag()  { return "Calculus.Differential.TotalDerivative"; }
	getName() { return CalculusPackage.messages.nameTotalDerivative; }
	canHaveChildren(count) { return count >= 2; }
	getChildName(index) {
		return index === 0 ?
			CalculusPackage.messages.childDerivativeFunction :
			CalculusPackage.messages.childDerivativeVariable
		;
	}
	
	prepareDisplay(context) {
		switch (CalculusPackage.styleTotal) {
			case TYPE_TOTAL_LEIBNIZ_QUOTIENT:
				prepareDisplayLeibnizQuotient(this, context, true);
				break;
			
			case TYPE_TOTAL_LEIBNIZ_OPERATOR:
				prepareDisplayLeibnizOperator(this, context, true);
				break;
			
			case TYPE_TOTAL_EULER:
				prepareDisplayEuler(this, context);
				break;
			
			case TYPE_TOTAL_SUBSCRIPT:
				prepareDisplaySubscript(this, context);
				break;
		}
	}
	
	display(context, x, y) {
		switch (CalculusPackage.styleTotal) {
			case TYPE_TOTAL_LEIBNIZ_QUOTIENT:
				displayLeibnizQuotient(this, context, x, y, true);
				break;

			case TYPE_TOTAL_LEIBNIZ_OPERATOR:
				displayLeibnizOperator(this, context, x, y, true);
				break;

			case TYPE_TOTAL_EULER:
				displayEuler(this, context, x, y);
				break;

			case TYPE_TOTAL_SUBSCRIPT:
				displaySubscript(this, context, x, y);
				break;
		}
	}
	
	moveTo(direction) {
		return direction === Expression.PREVIOUS ?
			this.children[0].moveTo(direction) :
			this.children[1].moveTo(direction)
		;
	}
	
	moveAcross(i, direction) {
		let last = this.children.length - 1;
		
		if (direction === Expression.NEXT     && i < last) return this.children[i + 1].moveTo(direction);
		if (direction === Expression.PREVIOUS && i > 0   ) return this.children[i - 1].moveTo(direction);
		
		return this.moveOut(direction);
	}
};

const TotalDerivativeNoVar = class extends Expression {
	getTag()  { return "Calculus.Differential.TotalDerivativeWithoutVariables"; }
	getName() { return CalculusPackage.messages.nameTotalDerivativeNoVar; }
	canHaveChildren(count) { return count === 1; }
	getChildName(index) { return CalculusPackage.messages.childDerivativeFunction; }
	
	getSerializationNames() { return [ "Order" ]; }
	async getSerializationStrings() { return [ String(this.order) ]; }
	setSerializationStrings(strings, promises) { this.order = parseInt(strings[0]); }
	
	prepareDisplay(context) {
		switch (CalculusPackage.styleTotalWithoutVariables) {
			case TYPE_TOTAL_NOVAR_LAGRANGE:
				prepareDisplayLagrange(this, context);
				break;
			
			case TYPE_TOTAL_NOVAR_NEWTON:
				prepareDisplayNewton(this, context);
				break;
		}
	}
	
	display(context, x, y) {
		switch (CalculusPackage.styleTotalWithoutVariables) {
			case TYPE_TOTAL_NOVAR_LAGRANGE:
				displayLagrange(this, context, x, y);
				break;

			case TYPE_TOTAL_NOVAR_NEWTON:
				displayNewton(this, context, x, y);
				break;
		}
	}
	
	moveTo(direction) {
		return this.children[0].moveTo(direction);
	}
};

const PartialDerivative = class extends Expression {
	getTag()               { return "Calculus.Differential.PartialDerivative"; }
	getName()              { return CalculusPackage.messages.namePartialDerivative; }
	canHaveChildren(count) { return count >= 2; }
	
	getChildName(index) {
		return index === 0 ?
			CalculusPackage.messages.childDerivativeFunction :
			CalculusPackage.messages.childDerivativeVariable
		;
	}
	
	prepareDisplay(context) {
		switch (CalculusPackage.stylePartial) {
			case TYPE_PARTIAL_LEIBNIZ_QUOTIENT:
				prepareDisplayLeibnizQuotient(this, context, false);
				break;
			
			case TYPE_PARTIAL_LEIBNIZ_OPERATOR:
				prepareDisplayLeibnizOperator(this, context, false);
				break;
		}
	}
	
	display(context, x, y) {
		switch (CalculusPackage.stylePartial) {
			case TYPE_PARTIAL_LEIBNIZ_QUOTIENT:
				displayLeibnizQuotient(this, context, x, y, false);
				break;

			case TYPE_PARTIAL_LEIBNIZ_OPERATOR:
				displayLeibnizOperator(this, context, x, y, false);
				break;
		}
	}
	
	moveTo(direction) {
		return direction === Expression.PREVIOUS ?
			this.children[0].moveTo(direction) :
			this.children[1].moveTo(direction)
		;
	}
	
	moveAcross(i, direction) {
		let last = this.children.length - 1;
		
		if (direction === Expression.NEXT     && i < last) return this.children[i + 1].moveTo(direction);
		if (direction === Expression.PREVIOUS && i > 0   ) return this.children[i - 1].moveTo(direction);
		
		return this.moveOut(direction);
	}
};

CalculusPackage.setExpressions = function(module) {
	Formulae.setExpression(module, "Calculus.Integral.IndefiniteIntegral",         IndefiniteIntegral);
	Formulae.setExpression(module, "Calculus.Integral.DefiniteIntegral",           DefiniteIntegral);
	Formulae.setExpression(module, "Calculus.Integral.DefiniteIntegralOverDomain", DefiniteIntegralOverDomain);
	
	Formulae.setExpression(module, "Calculus.Limit.Limit",         Limit);
	Formulae.setExpression(module, "Calculus.Limit.LimitInferior", LimitInferior);
	Formulae.setExpression(module, "Calculus.Limit.LimitSuperior", LimitSuperior);
	
	Formulae.setExpression(module, "Calculus.Differential.TotalDerivative",                 TotalDerivative);
	Formulae.setExpression(module, "Calculus.Differential.TotalDerivativeWithoutVariables", TotalDerivativeNoVar);
	Formulae.setExpression(module, "Calculus.Differential.PartialDerivative",               PartialDerivative);
};

CalculusPackage.isConfigurable = () => true;

CalculusPackage.onConfiguration = () => {
	let table = document.createElement("table");
	table.classList.add("bordered");
	
	let row, th, col, radio;
	
	////////////////////////////////////////////////////////////
	
	row = table.insertRow();
	th = document.createElement("th");
	th.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalTitle));
	row.appendChild(th);
	
	row = table.insertRow();
	col = row.insertCell();
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "total"; radio.value = TYPE_TOTAL_LEIBNIZ_QUOTIENT;
	radio.checked = (radio.value == CalculusPackage.styleTotal);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalLeibnizQuotient));
	
	col.appendChild(document.createElement("br"));
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "total"; radio.value = TYPE_TOTAL_LEIBNIZ_OPERATOR;
	radio.checked = (radio.value == CalculusPackage.styleTotal);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalLeibnizOperator));
	
	col.appendChild(document.createElement("br"));
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "total"; radio.value = TYPE_TOTAL_EULER;
	radio.checked = (radio.value == CalculusPackage.styleTotal);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalEuler));
	
	col.appendChild(document.createElement("br"));
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "total"; radio.value = TYPE_TOTAL_SUBSCRIPT;
	radio.checked = (radio.value == CalculusPackage.styleTotal);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalSubscript));
	
	////////////////////////////////////////////////////////////
	
	row = table.insertRow();
	th = document.createElement("th");
	th.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalWithoutVariablesTitle));
	row.appendChild(th);
	
	row = table.insertRow();
	col = row.insertCell();
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "totalwov"; radio.value = TYPE_TOTAL_NOVAR_LAGRANGE;
	radio.checked = (radio.value == CalculusPackage.styleTotalWithoutVariables);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalWithoutVariablesLagrange));
	
	col.appendChild(document.createElement("br"));
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "totalwov"; radio.value = TYPE_TOTAL_NOVAR_NEWTON;
	radio.checked = (radio.value == CalculusPackage.styleTotalWithoutVariables);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferenceTotalWithoutVariablesNewton));
	
	////////////////////////////////////////////////////////////
	
	row = table.insertRow();
	th = document.createElement("th");
	th.appendChild(document.createTextNode(CalculusPackage.messages.preferencePartialTitle));
	row.appendChild(th);
	
	row = table.insertRow();
	col = row.insertCell();
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "partial"; radio.value = TYPE_PARTIAL_LEIBNIZ_QUOTIENT;
	radio.checked = (radio.value == CalculusPackage.stylePartial);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferencePartialLeibnizQuotient));
	
	col.appendChild(document.createElement("br"));
	
	radio = document.createElement("input"); radio.type = "radio"; radio.name = "partial"; radio.value = TYPE_PARTIAL_LEIBNIZ_OPERATOR;
	radio.checked = (radio.value == CalculusPackage.stylePartial);
	col.appendChild(radio);
	col.appendChild(document.createTextNode(CalculusPackage.messages.preferencePartialLeibnizOperator));
	
	////////////////////////////////////////////////////////////
	
	row = table.insertRow();
	th = document.createElement("th");
	const button = document.createElement("button");
	button.innerText = "Ok";
	button.addEventListener("click", () => CalculusPackage.onChangeStyle());
	th.appendChild(button);
	row.appendChild(th);
	
	////////////////////////////////////////////////////////////
	
	Formulae.setModal(table);
};

CalculusPackage.onChangeStyle = function() {
	let total = document.querySelector('input[name="total"]:checked');
	if (total) CalculusPackage.styleTotal = parseInt(total.value);
	
	let totalwov = document.querySelector('input[name="totalwov"]:checked');
	if (totalwov) CalculusPackage.styleTotalWithoutVariables = parseInt(totalwov.value);
	
	let partial = document.querySelector('input[name="partial"]:checked');
	if (partial) CalculusPackage.stylePartial = parseInt(partial.value);
	
	Formulae.resetModal();
	Formulae.refreshHandlers();
};

