var svgNS="http://www.w3.org/2000/svg";

var Bound = function(block1, block2, type) {
    this.block1 = block1;
    this.block2 = block2;
    this.display = function (ctx) {
	var corners = ["topleft","topright","bottomright","bottomleft"];
	if (type === "input") {	    
	    var line = document.createElementNS(svgNS, "line");
	    line.setAttribute("class","input");
	    line.setAttribute("x1",block1.cx);
	    line.setAttribute("x2",block2.cx);
	    line.setAttribute("y1",block1.cy);
	    line.setAttribute("y2",block2.cy);
	    ctx.appendChild(line);
	    block1.addEventListener("cxchange", function () {
		line.setAttribute("x1",block1.cx);
	    }, false);
	    block1.addEventListener("cychange", function () {
		line.setAttribute("y1",block1.cy);
	    }, false);
	    block2.addEventListener("cxchange", function () {
		line.setAttribute("x2",block2.cx);
	    }, false);
	    block2.addEventListener("cychange", function () {
		line.setAttribute("y2",block2.cy);
	    }, false);

	} else if (type === "zoom") {
	    var lines = {}	    
	    function updateCorner1(n) {
		lines[corners[n]].setAttribute("x1",block1[corners[n]].x);
		lines[corners[n]].setAttribute("y1",block1[corners[n]].y);
	    }
	    function updateCorner2(n) {
		lines[corners[n]].setAttribute("x2",block2[corners[n]].x);
		lines[corners[n]].setAttribute("y2",block2[corners[n]].y);
	    }	    
	    function updateAllCorners1() {
		[0,1,2,3].map(function(i) { updateCorner1(i);});
	    }
	    function updateAllCorners2() {
		[0,1,2,3].map(function(i) { updateCorner2(i);});
	    }

	    for (var i = 0; i< corners.length ; i++) {
		var line = document.createElementNS(svgNS, "line");
		line.setAttribute("class","zoom");
		lines[corners[i]]=line;
		updateCorner1(i);
		updateCorner2(i);
		ctx.appendChild(line);
	    }
	    block1.addEventListener("topchange", updateAllCorners1, false);
	    block1.addEventListener("leftchange", updateAllCorners1, false);
	    block2.addEventListener("topchange", updateAllCorners2, false);
	    block2.addEventListener("leftchange", updateAllCorners2, false);

	} else if (type === "project") {
	    var lines = {};
	    var projected = document.createElementNS(svgNS,"polygon");
	    projected.setAttribute("class","projected");
	    projected.setAttribute("points","0,0 0,0 0,0 0,0");
	    function updateCornerP1(n) {
		lines[corners[n]].setAttribute("x1",block1[corners[n]].x);
		lines[corners[n]].setAttribute("y1",block1[corners[n]].y);
	    }
	    function updateCornerP2(n) {
		var newx, newy;
		if (block1.width < block2.width) {
		    newx = block2["topleft"].x + block1[corners[n]].x - block1["topleft"].x;
		    newy = block2["topleft"].y + block1[corners[n]].y - block1["topleft"].y;
		} else {
		    newx = block2[corners[n]].x;
		    newy =block2[corners[n]].y ;
		}
		projected.points.getItem(n).x = newx;
		projected.points.getItem(n).y = newy;
		lines[corners[n]].setAttribute("x2",newx);
		lines[corners[n]].setAttribute("y2",newy);
	    }	    
	    function updateAllCornersP1() {
		[0,1,2,3].map(function(i) { updateCornerP1(i);});
	    }
	    function updateAllCornersP2() {
		[0,1,2,3].map(function(i) { updateCornerP2(i);});
	    }

	    for (var i = 0; i< corners.length ; i++) {
		var line = document.createElementNS(svgNS, "line");
		line.setAttribute("class","project");
		lines[corners[i]]=line;
		updateCornerP1(i);
		updateCornerP2(i);
		ctx.appendChild(line);
	    }
	    ctx.insertBefore(projected,ctx.firstChild);
	    block1.addEventListener("topchange", updateAllCornersP1, false);
	    block1.addEventListener("leftchange", updateAllCornersP1, false);
	    block1.addEventListener("topchange", updateAllCornersP2, false);
	    block1.addEventListener("leftchange", updateAllCornersP2, false);
	    block2.addEventListener("topchange", updateAllCornersP2, false);
	    block2.addEventListener("leftchange", updateAllCornersP2, false);
	    
	}
    }
};

var LineOfBlocks = function(ctx, x,y, sep) {
    var self = this;
    self.x = x;
    self.y = y;
    self.sep = sep;
    var blocks = [];
    
    // readonly blocks property
    Object.defineProperty(this,"blocks", {"get":function() { return blocks;}, "set": function(b) {}});


    this.display = function () {};

    this._subscribeBlockEvents = function (b) {
    };

    this._positionBlock = function (b) {
	return {x:0,y:0};
    };

    this.addEventListener = function () {
    };

    this.addBlock = function(b) {
	this.blocks.push(b);
	var pos = self._positionBlock(self.blocks.length - 2);
	b.display(ctx, pos.x, pos.y);
	self._subscribeBlockEvents(b);
	return self;
    };

    this._redisplayAfter = function (b) {
	return;
	var found = false;
	var prevBlock;
	for (var i = 0; i<self.blocks.length;i++) {
	    var pos = self._positionBlock(i);
	    if (found) {
		self.blocks[i].display(ctx, pos.x, pos.y)
	    }
	    if (self.blocks[i]===b) {
		found = true;
	    }
	}
    }

}

var Row = function(ctx, x,y,sep) {
    var self = new LineOfBlocks(ctx, x,y,sep);

    self._positionBlock = function (i) {
	if (self.blocks.length === 1) {
	    return {x:x + self.blocks[0].width / 2,y:y};
	} else {
	    var rightMostBlock = self.blocks[i];
	    return {x:rightMostBlock.cx + rightMostBlock.width / 2 + sep,y:y};
	}
    };

    self._subscribeBlockEvents = function (b) {
	b.addEventListener("widthchange", function() { self._redisplayAfter(b);});
	b.addEventListener("leftchange", function() { self._redisplayAfter(b);});
    };

    self.addColumn = function(dy, sep) {
	var pos = self._positionBlock(self.blocks.length-1);
	var col = new Column(ctx, pos.x, pos.y + dy, sep);
	self.addBlock(col);
	return col;
    }

    return self;
};

var Column = function(ctx, x,y,sep) {
    var self = new LineOfBlocks(ctx, x,y,sep);

    self._positionBlock = function (i) {
	if (self.blocks.length === 1) {
	    return {x:x,y:y + self.blocks[0].height / 2};
	} else {
	    var bottomMostBlock = self.blocks[i];
	    return {x:x,y:bottomMostBlock.cy + bottomMostBlock.height / 2 + sep};
	}
    };

    self._subscribeBlockEvents = function (b) {
	b.addEventListener("heightchange", function() { self._redisplayAfter(b);});
	b.addEventListener("topchange", function() { self._redisplayAfter(b);});
    };


    return self;
};


var Block = function(initialWidth, initialHeight, name , options) {
    var self = this;
    var height = initialHeight;
    var width = initialWidth;
    var angle = 30;
    var left, top, cx = 0, cy = 0;
    options = options || {};
    var minsize = options.minsize || 0;
    var maxsize = options.maxsize || Infinity;
    var dep = [];
    var links = [];
    var depCallback = function () {};
    var topleft, topright, bottomleft, bottomright; 
    var frozen = false;
    topleft=  topright = bottomleft = bottomright= {x:0,y:0};

    this.addEventListener = function (eventType, callback, bubble) {
	if (!eventListeners[eventType]) {
	    eventListeners[eventType]=[];
	}
	eventListeners[eventType].push(callback);
    }

    
    if (options.dep) {
	dep = options.dep;
    }
    if (options.callback) {
	depCallback = options.callback;
    }

    var context;
    var eventListeners = {};

    Object.defineProperty(this, "cx", {"get":function() { return cx;}, "set": function(newX) { cx  = newX; updateCx(); updateLeft()}});
    Object.defineProperty(this, "cy", {"get":function() { return cy;}, "set": function(newY) { cy = newY; updateCy(); updateTop()}});
    Object.defineProperty(this, "width", {"get":function() { return width;}, "set": function(newWidth) { updateWidth(newWidth); updateLeft();}});
    Object.defineProperty(this, "height", {"get":function() { return height;}, "set": function(newHeight) { updateHeight(newHeight); updateTop();}});

    Object.defineProperty(this, "topleft", {"get":function() { return topleft;}, "set": function() { }});
    Object.defineProperty(this, "topright", {"get":function() { return topright;}, "set": function() { }});
    Object.defineProperty(this, "bottomleft", {"get":function() { return bottomleft;}, "set": function() { }});
    Object.defineProperty(this, "bottomright", {"get":function() { return bottomright;}, "set": function() { }});

    this.name = name;

    var g = document.createElementNS(svgNS,"g");
    var rect = document.createElementNS(svgNS,"rect");
    
    g.appendChild(rect);
    
    var title = document.createElementNS(svgNS,"text");
    title.textContent = name;
    g.appendChild(title);
    
    var measure = document.createElementNS(svgNS,"line");
    measure.setAttribute("class","measure");
    g.appendChild(measure);
    
    var measureVal = document.createElementNS(svgNS,"text");
    g.appendChild(measureVal);

    if (options.adjustable) {
	var widthHandle = document.createElementNS(svgNS,"path");
	widthHandle.setAttribute("class","resize");
	widthHandle.setAttribute("d","M -12,0 L -4,-8 -4,-4 4,-4 4,-8 12,0 4,8 4,4 -4,4, -4,8 Z");
	var watching = false;
	var mouseHandle = function() {};
	g.appendChild(widthHandle);	    
    }

    this.width = width;
    this.height = height;
    var ratio = height/width;
    if (options.fixedRatio) {
	self.addEventListener("widthchange", function () { self.height = ratio * self.width;}, false );
    }
    depCallback.call(self,dep);

    this.display = function (ctx, x, y) {
	context =ctx;
	this.cx = x;
	this.cy = y;
	if (options.adjustable) {
	    mouseHandle =  function (e) {
		e.preventDefault();
		var mm = function (e) {
		    var dx = (e.movementX       ||
			      e.mozMovementX    ||
			      e.webkitMovementX ||
			      0)  * ctx.viewBox.baseVal.width / ctx.clientWidth / Math.tan(angle * Math.PI / 180);
		    if (self.width + dx > minsize && self.width + dx < maxsize) {
			self.width += dx;
		    }
		    document.querySelector("body").classList.add("resize");
		    e.preventDefault();
		    return false;
		};
		var mu = function () {
		    document.querySelector("body").classList.remove("resize");
		    document.removeEventListener("mousemove",mm, false);
		    document.removeEventListener("mousemove",mu, false);
		    watching = false;
		};
		if (!watching) {
		    document.addEventListener("mousemove", mm, false);
		    document.addEventListener("mouseup", mu, false);
		    watching = true;		
		}
		return false;
	    };	
	    widthHandle.addEventListener("mousedown", mouseHandle, false);	


	    var posX = x + width/2;
	    var posY = y - height / 4;
	    widthHandle.setAttribute("transform","translate(" + posX + "," + posY + ")");
	}

	ctx.appendChild(g);
	if (options.adjustable) {
	    self.addEventListener("widthchange", function(newWidth) {
		var posX = cx + width/2;
		var posY = cy - height/4;
		widthHandle.setAttribute("transform","translate(" + posX + "," + posY + ")");
	    });
	}
	self._displayLinks(ctx);
    }

    this.freeze = function () {
	if (options.adjustable && !frozen) {
	    widthHandle.removeEventListener("mousedown", mouseHandle, false);
	    widthHandle.classList.add("frozen");
	    frozen = true;
	}
    }

    this.unfreeze = function () {
	if (options.adjustable && frozen) {
	    widthHandle.addEventListener("mousedown", mouseHandle, false);	
	    widthHandle.classList.remove("frozen");
	    frozen = false;
	}
    }

    this._displayLinks = function (ctx) {
	for (var i = 0 ; i < links.length ; i++) {
	    links[i].display(ctx);
	}
    };

    function emit(eventType, value) {
	var listeners = eventListeners[eventType];
	if (listeners) {
	    for (var i = 0; i < listeners.length; i++) {
		listeners[i]({type:eventType, value:value});
	    }
	}
    }


    this.addEventListener("widthchange",updateLeft);
    this.addEventListener("heightchange",updateTop);


    dep.map(function(b) {
	b.block.addEventListener("widthchange",
			   function () { 
			       depCallback.call(self,dep);
			   });
	b.block.addEventListener("heightchange",
			   function () { 
			       depCallback.call(self,dep);
			   });
	links.push(new Bound(b.block, self, b.type));
    });


    function updateWidth(newWidth) {
	if (newWidth !== rect.width.baseVal.value) {
	    width = Math.max(minsize,Math.min(maxsize,newWidth));
	    rect.setAttribute("width",width);
	    if (cx) {
		measure.setAttribute("x2",cx + width/2);
	    }
	    measureVal.textContent = Math.floor(width) + "px";
	    emit("widthchange", width);
	}
    }
    function updateHeight(newHeight) {
	if (newHeight !== rect.height.baseVal.value) {
	    height = newHeight;
	    rect.setAttribute("height",newHeight);
	    if (cy) {
		title.setAttribute("y", cy - height/2 + 15);
	    }
	    emit("heightchange", newHeight);
	}
    }
    function updateCx() {
	measure.setAttribute("x2",cx + width/2);
	measureVal.setAttribute("x", cx);
	title.setAttribute("x", cx);
	emit("cxchange",cx);
    }
    function updateCy() {
	measure.setAttribute("y1",cy);
	measure.setAttribute("y2",cy);
	measureVal.setAttribute("y",cy - 15);
	title.setAttribute("y", cy - height/2 + 15);
	emit("cychange",cy);
    }

    function updateLeft() {
	var newLeft = cx - width/2;
	if (newLeft !== left) {
	    left = newLeft ;
	    var skew = width * Math.tan(angle * Math.PI/180) / 2;
	    topleft = {x:left,y:top + skew};
	    bottomleft = {x:left,y:top + height + skew};
	    topright = {x:left + width ,y:top - skew};
	    bottomright = {x:left + width ,y:top + height - skew};
	    g.setAttribute("transform","translate("+(left + width/2) +",0) skewY(-" + angle +") translate(-" + (left + width / 2) +",0)");
	    rect.setAttribute("x",left);
	    measure.setAttribute("x1",left);
	    emit("leftchange", left);
	}
    }
    function updateTop() {
	var newTop = cy - height/2;
	if (newTop !== top) {
	    var skew = width * Math.tan(angle * Math.PI/180) / 2;
	    top = newTop;
	    topleft = {x:left,y:top + skew};
	    bottomleft = {x:left,y:top + height + skew};
	    topright = {x:left + width ,y:top - skew};
	    bottomright = {x:left + width ,y:top + height - skew};
	    rect.setAttribute("y",top);
	    emit("topchange", top);
	}
    }

};

var Operation = function (width, height, name, options) {
    var virtual = { appendChild:function(){}};
    var self = new Block(0, 0, name, options);
    var parentDisplay = self.display;
    self.display = function(ctx, x, y) {
	self.cx = x;
	self.cy = y;
	parentDisplay(virtual,x,y);
	var circ = document.createElementNS(svgNS,"circle");
	circ.setAttribute("cx",x);
	circ.setAttribute("cy",y);
	circ.setAttribute("class","operation");
	circ.setAttribute("r",100);
	ctx.appendChild(circ);
	var title = document.createElementNS(svgNS,"text");
	title.setAttribute("class","operation");
	title.setAttribute("x",x);
	title.setAttribute("y",y);
	title.setAttribute("vertical-align","middle");
	title.textContent = name;
	ctx.appendChild(title);
	self._displayLinks(ctx);
    }
    return self;
};
