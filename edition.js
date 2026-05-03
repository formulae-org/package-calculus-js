/*
Fōrmulæ calculus package. Module for edition.
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

export class CalculusPackage extends Formulae.EditionPackage {};

CalculusPackage.editionCreateDefiniteIntegralOverDomain = function() {
	if (CalculusPackage.createDIODForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML = `
<tr><th colspan=2>${CalculusPackage.messages.editionDIODTitle}
<tr><td>${CalculusPackage.messages.editionDIODDimensions}<td><input type="number" value="2" min="1" max="9">
<tr><th colspan=2><button>Ok</button>
`;
		CalculusPackage.createDIODForm = table;
	}

	let tableRows = CalculusPackage.createDIODForm.rows;
	let dims = tableRows[1].cells[1].firstChild;
	let ok   = tableRows[2].cells[0].firstChild;

	ok.onclick = () => {
		let D = parseInt(dims.value);
		if (isNaN(D) || D < 1) {
			alert(CalculusPackage.messages.editionDIODInvalidDimensions);
			return;
		}

		Formulae.resetModal();

		let newExpr = Formulae.createExpression("Calculus.Integral.DefiniteIntegralOverDomain");
		newExpr.dimensions = D;
		Formulae.sExpression.replaceBy(newExpr);
		newExpr.addChild(Formulae.sExpression);   // integrand: current selection
		newExpr.addChild(new Expression.Null());  // domain
		newExpr.addChild(new Expression.Null());  // differential element

		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
	};

	Formulae.setModal(CalculusPackage.createDIODForm);
};

CalculusPackage.setEditions = function() {
	Formulae.addEdition(
		this.messages.pathIntegral, null, this.messages.leafIndefiniteIntegral,
		() => Expression.multipleEdition("Calculus.Integral.IndefiniteIntegral", 2, 0)
	);
	Formulae.addEdition(
		this.messages.pathIntegral, null, this.messages.leafDefiniteIntegral,
		() => Expression.multipleEdition("Calculus.Integral.DefiniteIntegral", 4, 0)
	);
	Formulae.addEdition(
		this.messages.pathIntegral, null, this.messages.leafDefiniteIntegralOverDomain,
		() => CalculusPackage.editionCreateDefiniteIntegralOverDomain()
	);
};

CalculusPackage.setActions = function() {};
