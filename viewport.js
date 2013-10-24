var svg = document.querySelector("#diagram");

var visibleArea = new MeasuredBlock({adjustable:true, fixedRatio: true, minsize: 320 / 5 , maxsize: 320/0.25 }, "Visible area (zoom)", 320,568);
var visibleArea2 = new MeasuredBlock({}, "Visible area (zoom)", 0, 0);
visibleArea2.mirrorOf(visibleArea);
var screen = new MeasuredBlock({}, "Mobile screen",640, 1136);

var content = new MeasuredBlock({openbottom: true, adjustable:true},"Fixed content width", 400,568);
var viewport = new MeasuredBlock({adjustable:true}, "viewport", 320, 568);
var body = new MeasuredBlock({openbottom:true}, "<body>", 0, 500);
var cssbody = new MeasuredBlock({openbottom:true}, "body {width}", 0, 500);

var viewableArea = new MeasuredBlock({openbottom: true}, "Viewable area", 400, 600);

var ExtendsToWidthOf = function (b, c) {
    var maxAmongst = function (i) {
	if (!maxAmongst.values) {
	    maxAmongst.values = [];
	}
	maxAmongst.values[i] = 0;
	return function (e) { 
	    maxAmongst.values[i] = e.value;
	    this.width = Math.max.apply({}, maxAmongst.values);
	};
    };
    return new CustomDependency(b, c, "Max", [{widthchange: maxAmongst(0)}, {widthchange: maxAmongst(1)}]);
};

var AOrMaxOfBC = function(block, blocks) {
    var aormaxbc = function(l) {
	if (!aormaxbc.values) {
	    aormaxbc.values = {};
	}
	aormaxbc.values[l] = 0;
	return function (e) {
	    aormaxbc.values[l] = e.value;
	    this.width = aormaxbc.values['A'] ? aormaxbc.values['A'] : Math.max(aormaxbc.values['B'], aormaxbc.values['C']);
	};
    };
    return new CustomDependency(block, blocks, "Switch", [{widthchange: aormaxbc('A')}, {widthchange: aormaxbc('B')}, {widthchange: aormaxbc('C')}]);
};


var bodyDiagram = new Diagram(body);
bodyDiagram.addCustomLink([cssbody, viewport, visibleArea2], AOrMaxOfBC);
var diagram = new Diagram(screen);
diagram.isZoomOf(visibleArea).isExtractionOf(viewableArea).extendsToWidthOf([body, content]);
bodyDiagram.display(svg, 2200,910);
diagram.display(svg, 400, 910);

visibleArea.freeze();

function updateViewport() {
    if (document.getElementById('hasWidth').checked || document.getElementById('hasScale').checked) {
	var values = [];
	if (document.getElementById('hasWidth').checked) { 
	    values.push("width=" + (document.getElementById('numericwidth').checked ? document.getElementById('width').value : "device-width"));
	    viewport.width = (document.getElementById('numericwidth').checked ? document.getElementById('width').value : 320) ;
	    if (document.getElementById('numericwidth').checked) {
		viewport.width = Math.floor(document.getElementById('width').value)  ;
	    }

	} else {
	    viewport.width = 0;
	}
	if (document.getElementById('hasScale').checked) { 
	    values.push("initial-scale=" + document.getElementById('scale').value);
	    visibleArea.width = 320 / document.getElementById('scale').value;
	} else {
	    visibleArea.width = 0;
	}

	document.getElementById('meta').value='<meta name="viewport" content="' + values.join(',') + '">'; 
    } else {
	viewport.width = 980 ;
	document.getElementById('meta').value='<meta name="viewport" content="">'; 
    }
    if (document.getElementById('hasScale').checked) {
	visibleArea.width = visibleArea.width / document.getElementById('scale').value;
    } else {
	visibleArea2.width = 0;
	visibleArea.width = viewableArea.width ;
    }
}

function updateVisibleArea() {
}

updateViewport();
updateVisibleArea();
document.getElementById('widthvalue').value = document.getElementById('width').value = 320 ;
document.getElementById('scalevalue').value = document.getElementById('scale').value;
document.getElementById('contentvalue').value = document.getElementById('content').value = content.width ;
document.getElementById('hasWidth').addEventListener("change", function () {
    updateViewport();
    updateVisibleArea();
    document.getElementById('devicewidth').disabled = !this.checked;
    document.getElementById('numericwidth').disabled = !this.checked;
    if (document.getElementById('devicewidth').checked || document.getElementById('numericwidth').disabled) {
	viewport.freeze();
    } else {
	viewport.unfreeze();
    }
});
document.getElementById('hasScale').addEventListener("change", function () {
    updateViewport();
    document.getElementById('scale').disabled = !this.checked;
    if (this.checked) {
	visibleArea.unfreeze();
    } else {
	visibleArea.freeze();
    }

});
document.getElementById('devicewidth').addEventListener("change", function () {
    viewport.freeze();
    document.getElementById('width').value=320;
    document.getElementById('width').disabled = this.checked;
    updateViewport();
});

document.getElementById('numericwidth').addEventListener("change", function () {
    viewport.unfreeze();
    document.getElementById('width').disabled = !this.checked;
    updateViewport();
});
document.getElementById('width').addEventListener("change", function () {
    document.getElementById('widthvalue').value = this.value;
    updateViewport();
});
document.getElementById('scale').addEventListener("change", function () {
    updateVisibleArea();
    document.getElementById('scalevalue').value = this.value;
});
visibleArea.addEventListener('widthchange', function () {
    if (document.getElementById('hasScale').checked) {
	document.getElementById('scalevalue').value = document.getElementById('scale').value =  320 / visibleArea.width;
    }
});
document.getElementById('content').addEventListener('change', function () {
    document.getElementById('contentvalue').value = this.value;
    content.width = this.value ;
});

content.addEventListener('widthchange', function () {
    document.getElementById('contentvalue').value = document.getElementById('content').value =  content.width ;
});

viewport.addEventListener('widthchange', function () {
    if (document.getElementById('numericwidth').checked && !document.getElementById('numericwidth').disabled) {
	document.getElementById('widthvalue').value = document.getElementById('width').value =  viewport.width ;
    }
});