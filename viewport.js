
var svg = document.querySelector("#diagram");

var visibleArea = new MeasuredBlock({adjustable:true, fixedRatio: true, minsize: 320 / 5 , maxsize: 320/0.25 }, "Visible area", 320,568);
var visibleArea2 = new MeasuredBlock({}, "Visible area", 320,568);
var screen = new MeasuredBlock({}, "Mobile screen",640, 1136);

var mirror = new MirrorDependency(visibleArea2, [visibleArea]);

var content = new MeasuredBlock({openbottom: true, adjustable:true},"Minimum rendered content area", 400,568);
var viewport = new MeasuredBlock({adjustable:true}, "viewport", 320, 568);


var layoutCanvas = new MeasuredBlock({openbottom: true}, "Layout canvas", 0, 0);

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

var extendsToWidthOf = new CustomDependency(layoutCanvas, [visibleArea2, viewport, content], "Max", [{widthchange: maxAmongst(0)}, {widthchange: maxAmongst(1)}, {widthchange: maxAmongst(2), heightchange: function (e) { this.height = e.value;}}]);
extendsToWidthOf.display(svg, 400, 400);

var zoomOf = new ZoomDependency(screen, [visibleArea]);
zoomOf.display(svg);

var projection = new ExtractionDependency(visibleArea,[layoutCanvas]);
projection.display(svg);

var r = new Row(svg, 0, 910, 200);
r.addBlock(screen).addBlock(visibleArea).addBlock(layoutCanvas);
var c = r.addColumn(-800, 320).addBlock(content).addBlock(viewport).addBlock(visibleArea2);

visibleArea.freeze();

function updateViewport() {
    if (document.getElementById('hasWidth').checked || document.getElementById('hasScale').checked) {
	var values = [];
	if (document.getElementById('hasWidth').checked) { 
	    values.push("width=" + (document.getElementById('numericwidth').checked ? document.getElementById('width').value : "device-width"));
	    viewport.width = 320 ;
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
document.getElementById('widthvalue').value = document.getElementById('width').value = viewport.width ;
document.getElementById('scalevalue').value = document.getElementById('scale').value;
document.getElementById('contentvalue').value = document.getElementById('content').value = content.width ;
document.getElementById('hasWidth').addEventListener("change", function () {
    updateViewport();
    document.getElementById('devicewidth').disabled = !this.checked;
    document.getElementById('numericwidth').disabled = !this.checked;
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
    document.getElementById('width').disabled = this.checked;
    updateViewport();
});

document.getElementById('numericwidth').addEventListener("change", function () {
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
    document.getElementById('widthvalue').value = document.getElementById('width').value =  viewport.width ;
});