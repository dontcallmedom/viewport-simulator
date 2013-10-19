
var svg = document.querySelector("svg");

var visibleArea = new Block(320,568, "Visible area", {adjustable:true, fixedRatio: true, minsize: 320 / 5 , maxsize: 320/0.25 });
var visibleArea2 = new Block(320,568, "Visible area", {dep:[{block:visibleArea, type:"mirror"}], callback: function(blocks) { this.width=blocks[0].block.width; this.height=blocks[0].block.height;}});
var screen = new Block(640, 1136, "Mobile screen");

var content = new Block(400,568,"Minimum rendered content area", {adjustable:true});
var viewport = new Block(320, 568, "viewport", {adjustable:true});

var maxOperation = new Operation(0,0,"max", {dep:[{block:visibleArea2,type:"input"}, {block:viewport, type:"input"}, {block:content, type:"input"}], callback:function(blocks) { this.width = Math.max.apply(null,blocks.map(function(b) { return b.block.width;})); this.height = Math.max.apply(null,blocks.map(function(b) { return b.block.height;}))}});

var layoutCanvas = new Block(0,0,"Layout canvas", {dep: [{block:maxOperation,type:"input"},], callback:function(blocks) { this.width = blocks[0].block.width; this.height = blocks[0].block.height;}});

var z = new Bound(visibleArea,screen,"zoom");
var p = new Bound(visibleArea,layoutCanvas,"project");
var r = new Row(svg, 0, 910, 200);
r.addBlock(screen).addBlock(visibleArea).addBlock(layoutCanvas).addBlock(maxOperation);
var c = r.addColumn(-800, 320).addBlock(content).addBlock(viewport).addBlock(visibleArea2);
z.display(svg);
p.display(svg);

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
	}

	document.getElementById('meta').value='<meta name="viewport" content="' + values.join(',') + '">'; 
    } else {
	viewport.width = 980 ;
	document.getElementById('meta').value='<meta name="viewport" content="">'; 
    }
}

function updateVisibleArea() {
    visibleArea.width = 320 ;
    if (document.getElementById('hasScale').checked) {
	visibleArea.width = visibleArea.width / document.getElementById('scale').value;
    }
}

updateViewport();
updateVisibleArea();
document.getElementById('widthvalue').value = document.getElementById('width').value = viewport.width ;
document.getElementById('scalevalue').value = document.getElementById('scale').value = 320 / visibleArea.width ;
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
    document.getElementById('scalevalue').value = document.getElementById('scale').value =  320 / visibleArea.width;
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