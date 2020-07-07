// A script for simulating particles with WebGL

// Define globals
let gl = null;
let glCanvas = null;
let shaderProgram;

window.addEventListener("load", initGL, false);


// The programs
let vertexShader = `
	attribute vec2 positions;
	void main(void) {
		gl_Position = vec4(positions, 0.0, 1.0);
		gl_PointSize = 20.0;
	}
`;
let fragmentShader = `
	precision mediump float;

	void main(void) {
		vec2 fragmentPosition = 2.0*gl_PointCoord - 1.0;
		float distanceSq = dot(fragmentPosition, fragmentPosition);
		float alpha = 1.0;
		if (distanceSq > 1.0) alpha = 0.0;
		gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
	}
`;


function initGL() {
	// Initial setup
	glCanvas = document.getElementById("glcanvas");
	gl = glCanvas.getContext("webgl");
	// Set the view port
	gl.viewport(0,0, glCanvas.width, glCanvas.height);
	
	
	// Setup the clear color and blending
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// Setup program
	const shaderSet = [
		{
			type: gl.VERTEX_SHADER,
			source: vertexShader
		},
		{
			type: gl.FRAGMENT_SHADER,
			source: fragmentShader
		}
	];
	shaderProgram = buildShaderProgram(shaderSet);
	gl.useProgram(shaderProgram);
	
	
	// Defining the initial geometry
	const dim = 2;
	var vertices = [
		0.0, 0.0,
		-0.5, -0.5,
		-0.5, 0.5,
		0.5, 0.5,
		0.5, -0.5,
		-0.55, -0.55
	];
	var n_vertices = vertices.length/dim;


	// Create an empty buffer object to store the vertex buffer
	var vertex_buffer = gl.createBuffer();
	
	// Pass the geometry data
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	

	// Get the attribute location
	var coord = gl.getAttribLocation(shaderProgram, "positions");

	// Bind vertex buffer object, Point an attribute to the currently bound VBO
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.vertexAttribPointer(coord, dim, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(coord);


	// Clear the color buffer
	gl.clear(gl.COLOR_BUFFER_BIT);
	// Draw the triangle
	gl.drawArrays(gl.POINTS, 0, n_vertices);
}




// Shader building tools from Mozilla
function buildShaderProgram(shaderInfo) {
	let program = gl.createProgram();

	shaderInfo.forEach(function(desc) {
		let shader = compileShader(desc.source, desc.type);
		if (shader) gl.attachShader(program, shader);
	});

	gl.linkProgram(program)

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log("Error linking shader program:");
		console.log(gl.getProgramInfoLog(program));
	}

	return program;
}

function compileShader(source, type) {
	let shader = gl.createShader(type);

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.log(`Error compiling ${type === gl.VERTEX_SHADER ? "vertex" : "fragment"} shader:`);
		console.log(gl.getShaderInfoLog(shader));
	}
	return shader;
}
