(function (global) {
    "use strict";

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

    var BaseObject = function () {
	var eventListeners = {};

	if (BaseObject.topId === undefined) {
	    BaseObject.topId = 0;
	}

	this.id = "b" + BaseObject.topId++;

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
	    if (this[prop]) {
		this.dispatchEvent({type:eventtype, value: this[prop]});
	    }
	}

	this.refresh = function () {
	    var self = this;
	    Object.keys(eventListeners).forEach(function (type) {
		self.triggerEvent(type);
	    });
	};

    };


    // A tree whose nodes are individual block or groups of blocks (the latter are necessarily leaves)
    var Diagram = function (blockOrBlocks, root) {
	var blocks = (Array.isArray(blockOrBlocks) ? blockOrBlocks : [blockOrBlocks]);
	var self = new BaseObject();
	root = root || self;
	var links = [];
	var sepx = 100; // make it configurable
	var sepy = 200;
	var descendants = blocks.map(function(b) { return b.id;});
	var acceptChild = !Array.isArray(blockOrBlocks);

	self.addEventListener("newchild", function (b) { descendants.push(b.id);});

	self.hasDescendant = function (block2) {
	    return descendants.indexOf(block2.id) !== -1;
	}

	function addChild(blockOrBlocks2) {	    	   
	    if (!acceptChild) {
		throw new Error("Trying to add a child to a node that does not accept it");
	    }
	    var blocks2 = (Array.isArray(blockOrBlocks2) ? blockOrBlocks2 : [blockOrBlocks2]);
	    blocks2.forEach(function (block2) {
		if (root.hasDescendant(block2)) {
		    throw new Error("Block " + block2.id + " already in Diagram, can’t add it again");
		}
		descendants.push(block2.id);
		self.dispatchEvent("newchild", block2);
	    });
	    var child = new Diagram(blockOrBlocks2, root);
	    child.addEventListener("newchild", function (b) { descendants.push(b.id);});
	    return child;
	}

	function addLink(block2, dep) {
	    var blocks2 = (Array.isArray(block2) ? block2 : [block2]);
	    if (!acceptChild) {
		throw new Error("Trying to add a child to a node that does not accept it");
	    }
	    var child = addChild(blocks2);
	    var edge = new dep(blocks[0], blocks2);
	    links.push({edge: edge, child: child});
	    return diagram;
	}
	
	self.isZoomOf = function (block2) {
	    return addLink(block2, ZoomDependency);
	};

	self.isExtractionOf = function (block2) {
	    return addLink(block2, ExtractionDependency);
	};

	// no return, this is necessarily a leave
	self.extendsToWidthOf = function (blocks2) {
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
	    
	    var ExtendsToWidthOf = function (b, c) {
		return new CustomDependency(b, c, "Max", [{widthchange: maxAmongst(0)}, {widthchange: maxAmongst(1)}, {widthchange: maxAmongst(2), heightchange: function (e) { this.height = e.value;}}]);
	    };

	    return addLink(blocks2, ExtendsToWidthOf);
	};

	self.display = function (ctx, x, y) {
	    blocks.forEach(function (block, i) {
		block.display(ctx, x, y + (i - (blocks.length - 1)/2)*sepy);
	    });
	    links.forEach(function (l) {
		l.edge.display(ctx, x+sepx/2, y);
		l.child.display(ctx, x+sepx, y);
	    });
	    blocks.forEach(function (b) { b.refresh();});

	};
	return self;
    };

    var Block = function (options) {
	var self = new BaseObject();
	var widthInit = false, heightInit = false;
	var width = 0 , height = 0, cx = 0, cy = 0;
	var minsize = options.minsize || 0;
	var maxsize = options.maxsize || Infinity;
	var ratio;

	options = options || {};
	options.angle = options.angle || 0;

	var deg = Math.PI/180;

	// self.width
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

	// self.height
	Object.defineProperty(self, "height", 
			      {"get":function () { return height;},
			       "set": function (newHeight) { 
				   if (!heightInit) {
				       if (options.fixedRatio && widthInit) {
					   ratio = newHeight / self.width;
					   height = newHeight;
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

	// self.cx
	Object.defineProperty(self, "cx", 
			      {"get":function() { return cx;},
			       "set": function(newX) { 
				   cx  = newX;
				   self.triggerEvent("cxchange");
			       }});

	// self.cy
	Object.defineProperty(self, "cy", 
			      {"get":function() { return cy;},
			       "set": function(newY) { 
				   cy  = newY;
				   self.triggerEvent("cychange");
			       }});

	// self.topleft
	Object.defineProperty(self, "topleft",
			      {"get": function() { return new Point(self.cx - self.width / 2, self.cy - self.height / 2 + self.width * Math.tan(options.angle * deg) / 2);},
			       "set": function() {}
			      });

	// self.topright
	Object.defineProperty(self, "topright", 
			      {"get":function() { return self.topleft.translate(self.width, - self.width*Math.tan(options.angle * deg));},
			       "set": function() { }});

	// self.bottomright
	Object.defineProperty(self, "bottomright", 
			      {"get":function() { return self.topright.translate(0, self.height);},
			       "set": function() { }});

	// self.bottomleft
	Object.defineProperty(self, "bottomleft", 
			      {"get":function() { return self.topleft.translate(0, self.height);},
			       "set": function() { }});


	self.mirror = function () {
	    var block = Object.create(Object.getPrototypeOf(self));
	    var mirror = new MirrorDependency(self, [block]);
	    return block;
	};

	self.display = function (ctx, x, y) {
	    self.cx = x;
	    self.cy = y;
	};
	return self;
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


    var MeasuredBlock = function(options, name, initialWidth, initialHeight) {
	options = options || {};
	options.angle = 30;
	var self = new NamedBlock(options, name);
	var left, top;

	Object.defineProperty(self, "left", {"get":function () { return left;}, "set": function () {}});
	Object.defineProperty(self, "top", {"get":function () { return top;}, "set": function () {}});

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
	self.addEventListener("widthchange",oncxchange);

	self.addEventListener("heightchange",onheightchange);


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

global.MeasuredBlock = (global.module || {}).exports = MeasuredBlock;

global.Diagram = (global.module || {}).exports = Diagram;
})(this);