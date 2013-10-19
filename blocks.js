(function (global) {
var svgNS="http://www.w3.org/2000/svg";

var Point = function(x,y) {
    this.x = x;
    this.y = y;
    this.translate = function (dx,dy) {
	return new Point(x+dx,y+dy);
    };
};

var Block = function (options) {
    var self = this;
    var eventListeners = {};
    var widthInit = false, heightInit = false;
    var width = 0 , height = 0, cx = 0, cy = 0;
    var minsize = options.minsize || 0;
    var maxsize = options.maxsize || Infinity;
    var ratio;

    options = options || {};
    options.angle = options.angle || 0;

    var deg = Math.PI/180;

    // this.width
    Object.defineProperty(self, "width", 
			  {"get":function () { return width;}, 
			   "set": function (newWidth) {
			       newWidth = Math.max(minsize,Math.min(maxsize,newWidth));
			       if (!widthInit) {
				   if (heightInit && options.fixedRatio) {
				       ratio = self.height / newWidth;
				   }
				   widthInit = true;
			       }
			       if (newWidth !== width) {
				   width = newWidth;
				   self.dispatchEvent({type:"widthchange",value: width});
				   if (options.fixedRatio && ratio !== undefined) {
				       height = ratio * self.width;
				       self.dispatchEvent({type:"heightchange", value: height});
				   }
			       }
			   }});

    // this.height
    Object.defineProperty(self, "height", 
			  {"get":function () { return height;},
			   "set": function (newHeight) { 
			       if (!heightInit) {
				   if (widthInit && options.fixedRatio) {
				       ratio = newHeight / self.width;
				   }
				   heightInit = true;
			       }
			       if (newHeight !== height) {
				   // With fixed ratio, we give precedence to the width setter
				   if (options.fixedRatio & ratio !== undefined) {
				       self.width = newHeight / ratio;
				   } else  {
				       height = newHeight;
				       self.dispatchEvent({type:"heightchange", value: height});
				   }
			       }
			   }});

    // this.cx
    Object.defineProperty(self, "cx", 
			  {"get":function() { return cx;},
			   "set": function(newX) { 
			       cx  = newX;
			       self.dispatchEvent({type:"cxchange", value: cx});
			   }});

    // this.cy
    Object.defineProperty(self, "cy", 
			  {"get":function() { return cy;},
			   "set": function(newY) { 
			       cy  = newY;
			       self.dispatchEvent({type:"cychange", value: cy});
			   }});

    // this.topleft
    Object.defineProperty(self, "topleft",
			   {"get": function() { return new Point(self.cx - self.width / 2, self.cy - self.height / 2 + self.width * Math.tan(options.angle * deg) / 2);},
			    "set": function() {}
			    });

    // this.topright
    Object.defineProperty(self, "topright", 
			  {"get":function() { return self.topleft.translate(self.width, - self.width*Math.tan(options.angle * deg));},
			   "set": function() { }});

    // this.bottomright
    Object.defineProperty(self, "bottomright", 
			  {"get":function() { return self.topright.translate(0, self.height);},
			   "set": function() { }});

    // this.bottomleft
    Object.defineProperty(self, "bottomleft", 
			  {"get":function() { return self.topleft.translate(0, self.height);},
			   "set": function() { }});

    this.addEventListener = function (eventType, callback, bubble) {
	if (!eventListeners[eventType]) {
	    eventListeners[eventType]=[];
	}
	eventListeners[eventType].push(callback);
    };

    this.dispatchEvent = function (event) {
	var listeners = eventListeners[event.type];
	if (listeners) {
	    for (var i = 0; i < listeners.length; i++) {
		listeners[i]({type:event.type, value:event.value});
	    }
	}
    };

    this.display = function (ctx, x, y) {
	self.cx = x;
	self.cy = y;
    };

};

var NamedBlock = function (options, name) {
    var self = new Block(options);
    self.name = name;
    return self;
};

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


var MeasuredBlock = function(options, name, initialWidth, initialHeight) {
    options = options || {};
    options.angle = 30;
    var self = new NamedBlock(options, name);
    var left, top;
    var dep = [];
    var links = [];
    var depCallback = function () {};
    var frozen = false;

    
    if (options.dep) {
	dep = options.dep;
    }
    if (options.callback) {
	depCallback = options.callback;
    }

    var context;

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

    self.width = initialWidth;
    self.height = initialHeight;

    depCallback.call(self,dep);

    self.display = function (ctx, x, y) {
	context =ctx;
	self.cx = x;
	self.cy = y;
	if (options.adjustable) {
	    mouseHandle =  function (e) {
		e.preventDefault();
		var mm = function (e) {
		    var dx = Math.floor((e.movementX       ||
			      e.mozMovementX    ||
			      e.webkitMovementX ||
			      0)  * ctx.viewBox.baseVal.width / ctx.clientWidth / Math.tan(options.angle * Math.PI / 180));
		    self.width += dx;
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


	    var posX = x + self.width/2;
	    var posY = y - self.height / 4;
	    widthHandle.setAttribute("transform","translate(" + posX + "," + posY + ")");
	}
	if (options.openbottom) {
	    rect.setAttribute("stroke-dasharray", openbottomstroke());
	}

	ctx.appendChild(g);
	if (options.adjustable) {
	    self.addEventListener("widthchange", function(newWidth) {
		var posX = self.cx + self.width/2;
		var posY = self.cy - self.height/4;
		widthHandle.setAttribute("transform","translate(" + posX + "," + posY + ")");
	    });
	}
	self._displayLinks(ctx);
    }

    self.freeze = function () {
	if (options.adjustable && !frozen) {
	    widthHandle.removeEventListener("mousedown", mouseHandle, false);
	    widthHandle.classList.add("frozen");
	    frozen = true;
	}
    }

    self.unfreeze = function () {
	if (options.adjustable && frozen) {
	    widthHandle.addEventListener("mousedown", mouseHandle, false);	
	    widthHandle.classList.remove("frozen");
	    frozen = false;
	}
    }

    self._displayLinks = function (ctx) {
	for (var i = 0 ; i < links.length ; i++) {
	    links[i].display(ctx);
	}
    };

    self.addEventListener("widthchange",onwidthchange);
    self.addEventListener("widthchange",onheightchange);
    self.addEventListener("widthchange",oncxchange);

    self.addEventListener("widthchange",updateLeft);
    self.addEventListener("heightchange",updateTop);

    self.addEventListener("cxchange",oncxchange);
    self.addEventListener("cxchange",updateLeft);

    self.addEventListener("cychange",oncychange);
    self.addEventListener("cychange",updateTop);


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

    function openbottomstroke() {
	function repeatString(str, num) {
	    return new Array( Math.floor(num + 1) ).join( str );
	}
	return (self.width + self.height * 3 / 4) + "," + repeatString("2,2,",self.height / 16) + self.width + "," + repeatString("2,2,",self.height / 16) + (self.width + self.height * 3 / 4);
    }


    function onwidthchange() {
	if (self.width !== rect.width.baseVal.value) {
	    rect.setAttribute("width", self.width);
	    if (options.openbottom) {
		rect.setAttribute("stroke-dasharray", openbottomstroke());
	    }
	    if (self.cx) {
		measure.setAttribute("x2",self.cx + self.width/2);
	    }
	    measureVal.textContent = Math.floor(self.width) + "px";
	}
    }

    function onheightchange() {
	if (self.height !== rect.height.baseVal.value) {
	    rect.setAttribute("height", self.height);
	    if (options.openbottom) {
		rect.setAttribute("stroke-dasharray", openbottomstroke());
	    }
	    if (self.cy) {
		title.setAttribute("y", self.cy - self.height/2 + 15);
	    }
	}
    }

    function oncxchange() {
	measure.setAttribute("x2",self.cx + self.width/2);
	measureVal.setAttribute("x", self.cx);
	title.setAttribute("x", self.cx);
    }

    function oncychange() {
	measure.setAttribute("y1", self.cy);
	measure.setAttribute("y2", self.cy);
	measureVal.setAttribute("y", self.cy - 15);
	title.setAttribute("y", self.cy - self.height/2 + 15);
    }

    function updateLeft() {
	var newLeft = self.cx - self.width/2;
	if (newLeft !== left) {
	    left = newLeft ;
	    g.setAttribute("transform","translate("+(left + self.width/2) +",0) skewY(-" + options.angle +") translate(-" + (left + self.width / 2) +",0)");
	    rect.setAttribute("x",left);
	    measure.setAttribute("x1",left);
	    self.dispatchEvent({type:"leftchange", value:left});
	}
    }
    function updateTop() {
	var newTop = self.cy - self.height/2;
	if (newTop !== top) {
	    var skew = self.width * Math.tan(options.angle * Math.PI/180) / 2;
	    top = newTop;
	    rect.setAttribute("y",top);
	    self.dispatchEvent({type:"topchange", value:top});
	}
    }
    return self;
};

var Operation = function (width, height, name, options) {
    var virtual = { appendChild:function(){}};
    var self = new MeasuredBlock( options, name,0, 0);
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

global.Block = (global.module || {}).exports = Block;
global.MeasuredBlock = (global.module || {}).exports = MeasuredBlock;
global.Operation = (global.module || {}).exports = Operation;
global.Bound = (global.module || {}).exports = Bound;
global.Row = (global.module || {}).exports = Row;
global.Column = (global.module || {}).exports = Column;
})(this);