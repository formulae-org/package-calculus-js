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

"use strict";

export class CalculusPackage extends Formulae.EditionPackage {};

// The form is created once on first use. Both editionCreateDefiniteIntegralOverDomain
// and actionEditDefiniteIntegralOverDomain share it, each re-assigning ok.onclick.
CalculusPackage.ensureDIODForm = function() {
	if (CalculusPackage.createDIODForm === undefined) {
		let table = document.createElement("table");
		table.classList.add("bordered");
		table.innerHTML = `
<tr><th colspan=2>${CalculusPackage.messages.editionDIODTitle}
<tr><td>${CalculusPackage.messages.editionDIODDimensions}<td><input type="number" value="2" min="1" max="9">
<tr><td>${CalculusPackage.messages.editionDIODClosedDomain}<td><input type="checkbox">
<tr><th colspan=2><button>Ok</button>
`;
		CalculusPackage.createDIODForm = table;
	}
};

CalculusPackage.editionCreateDefiniteIntegralOverDomain = function() {
	CalculusPackage.ensureDIODForm();
	
	let tableRows = CalculusPackage.createDIODForm.rows;
	let dims   = tableRows[1].cells[1].firstChild;
	let closed = tableRows[2].cells[1].firstChild;
	let ok     = tableRows[3].cells[0].firstChild;
	
	ok.onclick = () => {
		let D = parseInt(dims.value);
		if (isNaN(D) || D < 1) {
			alert(CalculusPackage.messages.editionDIODInvalidDimensions);
			return;
		}
		
		Formulae.resetModal();
		
		let newExpr = Formulae.createExpression("Calculus.Integral.DefiniteIntegralOverDomain");
		newExpr.dimensions   = D;
		newExpr.closedDomain = closed.checked;
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

// The form is created once on first use. All three limit action handlers share it,
// each re-assigning ok.onclick.
CalculusPackage.ensureLimitForm = function() {
	if (CalculusPackage.limitForm !== undefined) return;
	let table = document.createElement("table");
	table.classList.add("bordered");
	table.innerHTML = `
<tr><th colspan=2>${CalculusPackage.messages.editionLimitTitle}
<tr><td>${CalculusPackage.messages.editionLimitApproachDirection}<td><select>
    <option value="Both">${CalculusPackage.messages.editionLimitBoth}</option>
    <option value="Left">${CalculusPackage.messages.editionLimitLeft}</option>
    <option value="Right">${CalculusPackage.messages.editionLimitRight}</option>
</select>
<tr><th colspan=2><button>Ok</button>
`;
	CalculusPackage.limitForm = table;
};

CalculusPackage.actionEditLimit = function() {
	CalculusPackage.ensureLimitForm();
	let tableRows = CalculusPackage.limitForm.rows;
	let dir = tableRows[1].cells[1].firstChild;
	let ok  = tableRows[2].cells[0].firstChild;
	
	dir.value = Formulae.sExpression.approachDirection || "Both";
	
	ok.onclick = () => {
		Formulae.resetModal();
		Formulae.sExpression.approachDirection = dir.value;
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
	};
	
	Formulae.setModal(CalculusPackage.limitForm);
};

CalculusPackage.actionEditDefiniteIntegralOverDomain = function() {
	CalculusPackage.ensureDIODForm();
	
	let tableRows = CalculusPackage.createDIODForm.rows;
	let dims   = tableRows[1].cells[1].firstChild;
	let closed = tableRows[2].cells[1].firstChild;
	let ok     = tableRows[3].cells[0].firstChild;
	
	dims.value     = Formulae.sExpression.dimensions   || 1;
	closed.checked = Formulae.sExpression.closedDomain || false;
	
	ok.onclick = () => {
		let D = parseInt(dims.value);
		if (isNaN(D) || D < 1) {
			alert(CalculusPackage.messages.editionDIODInvalidDimensions);
			return;
		}
		
		Formulae.resetModal();
		
		Formulae.sExpression.dimensions   = D;
		Formulae.sExpression.closedDomain = closed.checked;
		
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
	};
	
	Formulae.setModal(CalculusPackage.createDIODForm);
};

CalculusPackage.editionCreateTotalDerivativeNoVar = function() {
	let newExpr = Formulae.createExpression("Calculus.Differential.TotalDerivativeWithoutVariables");
	newExpr.order = 1;
	Formulae.sExpression.replaceBy(newExpr);
	newExpr.addChild(Formulae.sExpression);
	Formulae.sHandler.prepareDisplay();
	Formulae.sHandler.display();
	Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
};

CalculusPackage.ensureDerivativeNoVarForm = function() {
	if (CalculusPackage.derivativeNoVarForm !== undefined) return;
	let table = document.createElement("table");
	table.classList.add("bordered");
	table.innerHTML = `
<tr><th colspan=2>${CalculusPackage.messages.editionDerivativeNoVarTitle}
<tr><td>${CalculusPackage.messages.editionDerivativeNoVarOrder}<td><input type="number" value="1" min="0">
<tr><th colspan=2><button>Ok</button>
`;
	CalculusPackage.derivativeNoVarForm = table;
};

CalculusPackage.actionEditDerivativeNoVar = function() {
	CalculusPackage.ensureDerivativeNoVarForm();
	let tableRows = CalculusPackage.derivativeNoVarForm.rows;
	let order = tableRows[1].cells[1].firstChild;
	let ok    = tableRows[2].cells[0].firstChild;
	order.value = Formulae.sExpression.order ?? 1;
	ok.onclick = () => {
		let n = parseInt(order.value);
		if (isNaN(n) || n < 0) return;
		Formulae.resetModal();
		Formulae.sExpression.order = n;
		Formulae.sHandler.prepareDisplay();
		Formulae.sHandler.display();
		Formulae.setSelected(Formulae.sHandler, Formulae.sExpression, false);
	};
	Formulae.setModal(CalculusPackage.derivativeNoVarForm);
};

CalculusPackage.setEditions = function() {
	// Integrals
	Formulae.addEdition(
		this.messages.pathIntegral, Formulae.icon("Calculus.Integral.IndefiniteIntegral", 2), this.messages.leafIndefiniteIntegral,
		() => Expression.multipleEdition("Calculus.Integral.IndefiniteIntegral", 2, 0)
	);
	Formulae.addEdition(
		this.messages.pathIntegral, Formulae.icon("Calculus.Integral.DefiniteIntegral", 4), this.messages.leafDefiniteIntegral,
		() => Expression.multipleEdition("Calculus.Integral.DefiniteIntegral", 4, 0)
	);
	Formulae.addEdition(
		this.messages.pathIntegral, Formulae.icon("Calculus.Integral.DefiniteIntegralOverDomain", 3, ' Dimensions="2" ClosedDomain="False"'), this.messages.leafDefiniteIntegralOverDomain,
		() => CalculusPackage.editionCreateDefiniteIntegralOverDomain()
	);

	// Limits
	Formulae.addEdition(
		this.messages.pathLimit, Formulae.icon("Calculus.Limit.Limit", 3), this.messages.leafLimit,
		() => Expression.multipleEdition("Calculus.Limit.Limit", 3, 0)
	);
	Formulae.addEdition(
		this.messages.pathLimit, Formulae.icon("Calculus.Limit.LimitInferior", 3), this.messages.leafLimitInferior,
		() => Expression.multipleEdition("Calculus.Limit.LimitInferior", 3, 0)
	);
	Formulae.addEdition(
		this.messages.pathLimit, Formulae.icon("Calculus.Limit.LimitSuperior", 3), this.messages.leafLimitSuperior,
		() => Expression.multipleEdition("Calculus.Limit.LimitSuperior", 3, 0)
	);

	// Differential
	Formulae.addEdition(
		this.messages.pathDifferential, Formulae.icon("Calculus.Differential.TotalDerivative", 2), this.messages.leafTotalDerivative,
		() => Expression.multipleEdition("Calculus.Differential.TotalDerivative", 2, 0)
	);
	Formulae.addEdition(
		this.messages.pathDifferential, Formulae.icon("Calculus.Differential.TotalDerivativeWithoutVariables", 1, ' Order="1"'), this.messages.leafTotalDerivativeNoVar,
		() => CalculusPackage.editionCreateTotalDerivativeNoVar()
	);
	Formulae.addEdition(
		this.messages.pathDifferential, Formulae.icon("Calculus.Differential.PartialDerivative", 2), this.messages.leafPartialDerivative,
		() => Expression.multipleEdition("Calculus.Differential.PartialDerivative", 2, 0)
	);

	// Evaluation bar
	Formulae.addEdition(
		this.messages.pathCalculus, Formulae.icon("Calculus.EvaluationBar", 3), this.messages.leafEvaluationBar,
		() => Expression.multipleEdition("Calculus.EvaluationBar", 3, 0)
	);
};

CalculusPackage.setActions = function() {
	Formulae.addAction("Calculus.Integral.DefiniteIntegralOverDomain", {
		isAvailableNow: () => true,
		getDescription: () => CalculusPackage.messages.actionEditDIOD,
		doAction: () => CalculusPackage.actionEditDefiniteIntegralOverDomain()
	});
	let editLimitAction = {
		isAvailableNow: () => true,
		getDescription: () => CalculusPackage.messages.actionEditLimit,
		doAction: () => CalculusPackage.actionEditLimit()
	};
	Formulae.addAction("Calculus.Limit.Limit",         editLimitAction);
	Formulae.addAction("Calculus.Limit.LimitInferior", editLimitAction);
	Formulae.addAction("Calculus.Limit.LimitSuperior", editLimitAction);
	Formulae.addAction("Calculus.Differential.TotalDerivativeWithoutVariables", {
		isAvailableNow: () => true,
		getDescription: () => CalculusPackage.messages.actionEditDerivativeNoVar,
		doAction: () => CalculusPackage.actionEditDerivativeNoVar()
	});
};
