(function (global) {
    // shortcut
    function svgEl(el) {
	return document.createElementNS("http://www.w3.org/2000/svg", el);
    }

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
				       self.triggerEvent("widthchange");
				       if (options.fixedRatio && ratio !== undefined) {
					   height = ratio * self.width;
					   self.triggerEvent("heightchange");
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
					   self.triggerEvent("heightchange");

				       }
				   }
			       }});

	// this.cx
	Object.defineProperty(self, "cx", 
			      {"get":function() { return cx;},
			       "set": function(newX) { 
				   cx  = newX;
				   self.triggerEvent("cxchange");
			       }});

	// this.cy
	Object.defineProperty(self, "cy", 
			      {"get":function() { return cy;},
			       "set": function(newY) { 
				   cy  = newY;
				   self.triggerEvent("cychange");
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
		    listeners[i].bind(this)({type:event.type, value:event.value});
		}
	    }
	};

	this.triggerEvent = function (eventtype) {
	    var prop = eventtype.replace(/change/,"");
	    if (self[prop]) {
		self.dispatchEvent({type:eventtype, value: self[prop]});
	    }
	}

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

    var Dependency = function (block1, blocks) {
	var self = this;
	self.display = function(ctx, x, y) {
	};
    };

    var ZoomDependency = function (block1, blocks) {
	var self = new Dependency(block1, blocks);
	var corners = ["topleft","topright","bottomright","bottomleft"];
	var blocksZoom = blocks.map(function (block) {
	    return corners.map(function () {
		var line = svgEl("line");
		line.setAttribute("class", "zoom");
		return line;
	    });
	});

	self.display = function(ctx, x, y) {
	    blocks.forEach(function (block, i) {
		var lines = blocksZoom[i];
		corners.forEach(function (corner, j) {
		    // TODO: move out of loop
		    function updateCorner(n) {
			return function () {
			    lines[j].setAttribute("x" + n,this[corner].x);
			    lines[j].setAttribute("y" + n,this[corner].y);
			};
		    }
		    block1.addEventListener("topchange", updateCorner(2));
		    block1.addEventListener("leftchange", updateCorner(2));
		    block.addEventListener("topchange", updateCorner(1));
		    block.addEventListener("leftchange", updateCorner(1));
		    ctx.appendChild(lines[j]);
		});
	    });
	}

	return self;
    };

    var ExtractionDependency = function (block1, blocks) {
	var self = new Dependency(block1, blocks);
	var self = new Dependency(block1, blocks);
	var corners = ["topleft","topright","bottomright","bottomleft"];
	var blocksProjections = blocks.map(function (block) {
	    return corners.map(function () {
		var line = svgEl("line");
		line.setAttribute("class", "project");
		return line;
	    });
	});
	var blocksAreas = blocks.map(function (block) {
	    var area = svgEl("polygon");
	    area.setAttribute("class","projected");
	    area.setAttribute("points","0,0 0,0 0,0 0,0");
	    return area;
	});

	self.display = function(ctx, x, y) {
	    blocks.forEach(function (block, i) {
		var lines = blocksProjections[i];
		var area = blocksAreas[i];
		corners.forEach(function (corner, j) {
		    // TODO: move out of loop
		    function updateBlock1() {
			lines[j].setAttribute("x1",this[corner].x);
			lines[j].setAttribute("y1",this[corner].y);
		    }
		    function updateBlock2() {
			var newx, newy;
			if (block1.width < block.width) {
			    newx = block["topleft"].x + block1[corner].x - block1["topleft"].x;
			    newy = block["topleft"].y + block1[corner].y - block1["topleft"].y;
			} else {
			    newx = block[corner].x;
			    newy = block[corner].y ;
			}
			area.points.getItem(j).x = newx;
			area.points.getItem(j).y = newy;
			lines[j].setAttribute("x2",newx);
			lines[j].setAttribute("y2",newy);
			
		    }
		    block1.addEventListener("topchange", updateBlock1);
		    block1.addEventListener("leftchange", updateBlock1);
		    block1.addEventListener("topchange", updateBlock2);
		    block1.addEventListener("leftchange", updateBlock2);
		    block.addEventListener("topchange", updateBlock2);
		    block.addEventListener("leftchange", updateBlock2);
		    ctx.appendChild(lines[j]);
		});
		ctx.appendChild(area);
	    });
	}

	return self;

    };

    var MirrorDependency = function (block1, blocks) {
	var self = new Dependency(block1, blocks);
	var eventmap = {"widthchange": function (e) { block1.width = e.value;},
			"heightchange": function (e) { block1.height = e.value;}
		       }
	blocks.forEach(function (block, i) {
	    for (var eventtype in eventmap) {
		block.addEventListener(eventtype, eventmap[eventtype]);
	    }
	});


	return self;
    };

    var CustomDependency = function (block1, blocks, name, eventmaps) {
	function rebinder(fn) {
	    return fn.bind(block1);
	}

	var operation = new Operation({}, name);
	var self = new Dependency(block1, blocks);

	var outputLine = svgEl( "line");
	outputLine.setAttribute("class", "input");

	var inputLines = blocks.map(function () { 
	    var l = svgEl( "line");
	    l.setAttribute("class", "input");
	    return l;
	});

	blocks.forEach(function (block, i) {
	    var blockEventMap = eventmaps[i];
	    for (var eventtype in blockEventMap) {
		block.addEventListener(eventtype, rebinder(blockEventMap[eventtype]));
		block.triggerEvent(eventtype);
	    }
	});

	self.display = function(ctx, x, y) {
	    operation.addEventListener("cxchange", function () {
		outputLine.setAttribute("x1", operation.cx);
		inputLines.forEach(function (l) {
		    l.setAttribute("x2", operation.cx);
		});
	    });
	    operation.addEventListener("cychange", function () {
		outputLine.setAttribute("y1", operation.cy);
		inputLines.forEach(function (l) {
		    l.setAttribute("y2", operation.cy);
		});
	    });
	    block1.addEventListener("cxchange", function () {
		outputLine.setAttribute("x2", block1.cx);
	    });
	    block1.addEventListener("cychange", function () {
		outputLine.setAttribute("y2", block1.cy);
	    });
	    blocks.forEach(function (block, i) {
		var l = inputLines[i];
		block.addEventListener("cxchange", function () {
		    l.setAttribute("x1", block.cx);
		});
		block.addEventListener("cychange", function () {
		    l.setAttribute("y1", block.cy);
		});
	    });
	    operation.display(ctx, x, y);
	    ctx.appendChild(outputLine);
	    inputLines.forEach(function (l) { ctx.appendChild(l);});
	};
	return self;
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
	var frozen = false;

	var g = svgEl("g");
	var rect = svgEl("rect");
	
	g.appendChild(rect);
	
	var title = svgEl("text");
	title.textContent = name;
	g.appendChild(title);
	
	var measure = svgEl("line");
	measure.setAttribute("class","measure");
	g.appendChild(measure);
	
	var measureVal = svgEl("text");
	g.appendChild(measureVal);

	if (options.adjustable) {
	    var widthHandle = svgEl("path");
	    widthHandle.setAttribute("class","resize");
	    widthHandle.setAttribute("d","M -12,0 L -4,-8 -4,-4 4,-4 4,-8 12,0 4,8 4,4 -4,4, -4,8 Z");
	    var watching = false;
	    var mouseHandle = function() {};
	    g.appendChild(widthHandle);	    
	}

	self.width = initialWidth;
	self.height = initialHeight;

	self.display = function (ctx, x, y) {
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

	self.addEventListener("widthchange",onwidthchange);
	self.addEventListener("widthchange",onheightchange);
	self.addEventListener("widthchange",oncxchange);

	self.addEventListener("widthchange",updateLeft);
	self.addEventListener("heightchange",updateTop);

	self.addEventListener("cxchange",oncxchange);
	self.addEventListener("cxchange",updateLeft);

	self.addEventListener("cychange",oncychange);
	self.addEventListener("cychange",updateTop);

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

    var Operation = function (options, name, radius) {
	var self = new NamedBlock( options, name);
	radius = radius || 100;
	self.display = function(ctx, x, y) {
	    self.cx = x;
	    self.cy = y;
	    var circ = svgEl("circle");
	    circ.setAttribute("cx",x);
	    circ.setAttribute("cy",y);
	    circ.setAttribute("class","operation");
	    circ.setAttribute("r",radius);
	    ctx.appendChild(circ);
	    var title = svgEl("text");
	    title.setAttribute("class","operation");
	    title.setAttribute("x",x);
	    title.setAttribute("y",y);
	    title.setAttribute("vertical-align","middle");
	    title.textContent = name;
	    ctx.appendChild(title);
	}
	return self;
    };

global.Block = (global.module || {}).exports = Block;
global.MeasuredBlock = (global.module || {}).exports = MeasuredBlock;
global.Operation = (global.module || {}).exports = Operation;
global.Row = (global.module || {}).exports = Row;
global.Column = (global.module || {}).exports = Column;
global.CustomDependency = (global.module || {}).exports = CustomDependency;
global.ZoomDependency = (global.module || {}).exports = ZoomDependency;
global.MirrorDependency = (global.module || {}).exports = MirrorDependency;
global.ExtractionDependency = (global.module || {}).exports = ExtractionDependency;
})(this);