var svg = document.querySelector("#diagram");

var visibleArea = new MeasuredBlock({adjustable:true, fixedRatio: true, minsize: 320 / 5 , maxsize: 320/0.25 }, "Visible area", 320,568);
var visibleArea2 = new MeasuredBlock({}, "Visible area", 0, 0);
visibleArea2.mirrorOf(visibleArea);
var screen = new MeasuredBlock({}, "Mobile screen",640, 1136);

var content = new MeasuredBlock({openbottom: true, adjustable:true},"Minimum rendered content area", 400,568);
var viewport = new MeasuredBlock({adjustable:true}, "viewport", 320, 568);


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
var layoutCanvas = new MeasuredBlock({openbottom: true}, "Layout canvas", 400, 600);

var diagram = new Diagram(screen);
diagram.isZoomOf(visibleArea).isExtractionOf(layoutCanvas).extendsToWidthOf([content,viewport,visibleArea2]);

diagram.display(svg, 400, 910);

visibleArea.freeze();

function updateViewport() {
    if (document.getElementById('hasWidth').checked || document.getElementById('hasScale').checked) {
	var values = [];
	if (document.getElementById('hasWidth').checked) { 
	    values.push("width=" + (document.getElementById('numericwidth').checked ? document.getElementById('width').value : "device-width"));
	    viewport.width = (document.getElementById('numericwidth').checked ? document.getElementById('width').value : 320) ;
	    if (document.getElementById('numericwidth').checked) {
		viewport.width = parseInt(document.getElementById('width').value,10)  ;
	    }

	} else {
	    viewport.width = 0;
	}
	if (document.getElementById('hasScale').checked) { 
	    values.push("initial-scale=" + document.getElementById('scale').value);
	    visibleArea.width = 320 / document.getElementById('scale').value;
	}

	document.getElementById('meta').value='<meta name="viewport" content="' + values.join(',') + '">'; 
    } else {
	viewport.width = 980 ;
	document.getElementById('meta').value='<meta name="viewport" content="">'; 
    }
}

function updateVisibleArea() {
    if (document.getElementById('hasScale').checked) {
	visibleArea.width = visibleArea.width / document.getElementById('scale').value;
    } else {
	visibleArea.width = layoutCanvas.width ;
    }
}

updateViewport();
updateVisibleArea();
document.getElementById('widthvalue').value = document.getElementById('width').value = 320 ;
document.getElementById('scalevalue').value = document.getElementById('scale').value;
document.getElementById('contentvalue').value = document.getElementById('content').value = content.width ;
document.getElementById('hasWidth').addEventListener("change", function () {
    updateViewport();
    document.getElementById('devicewidth').disabled = !this.checked;
    document.getElementById('numericwidth').disabled = !this.checked;
    if (document.getElementById('devicewidth').checked) {
	viewport.freeze();
    } else {
	viewport.unfreeze();
    }
});
document.getElementById('hasScale').addEventListener("change", function () {
    updateViewport();
    updateVisibleArea();
    document.getElementById('scale').disabled = !this.checked;
    if (this.checked) {
	visibleArea.unfreeze();
    } else {
	visibleArea.freeze();
    }

});
document.getElementById('devicewidth').addEventListener("change", function () {
    viewport.freeze();
    document.getElementById('numericwidth').value=320;
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
    if (document.getElementById('numericwidth').checked) {
	document.getElementById('widthvalue').value = document.getElementById('width').value =  viewport.width ;
    }
});