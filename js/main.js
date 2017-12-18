var canvas;
var stats;

var scene;
var camera;
var renderer;
var mesh;

var layer_sizes = [100, 1];

var netX = [];
var netY = [];
var netD = [];
var netW = [];
var netWPrev = [];
var netWChange = [];
var netWChangePrev = [];
var netWMod = [];
var netB = [];
var netBPrev = [];
var netBChange = [];
var netBChangePrev = [];
var netBMod = [];
var netT = [];

var topTmp = new THREE.Vector3();
var bottomTmp = new THREE.Vector3();
var rightTmp = new THREE.Vector3();
var leftTmp = new THREE.Vector3();
var diff = new THREE.Vector3();

var sphereX = [];
var sphereY = [];
var topOffset = [];
var rightOffset = [];
var spherePositions = [];

// setup variables //////////////////////////////////
var biases = true;
var processing = 0;
var back_prop = 0;
var set_order = 0;
var weight_init = 0;
var learning_rate = 0.001;
var grad1_learning_rate = 0.0005;
var grad2_learning_rate = 0.0032;
var sampleIndexing = [];

// running variables ////////////////////////////////
var step = false;
var iterate = false;
var test = false;
var play = false;
var reset = false;
var view = false;
var curveIterate = false;

var iteration = 0;
var iterationCount = 0;
var trainingSample = 0;
var testingSample = 0;

var max_weight = 0.001;
var max_bias = 0.001;
var max_weight_change = 0.001;
var max_bias_change = 0.001;
var max_x = 0.001;
var max_d = 0.001;

var trainingCost = 0.0;
var trainingMisses = 0;
var testingCost = 0.0;
var testingMisses = 0;
var accuracy = 0;

var trainingSize = 7000;
var testingSize = 1000;

// viewing variables //////////////////////////////////
var camLeft = false;
var camRight = false;
var camUp = false;
var camDown = false;

var visibleW = [];
var visibleX = [];
var visibleB = [];
var visibleY = [];

var view_type = 0;
var fpsCamera = false;

var baseLum = 0.7;

var multW = 0.2;
var cutoffW = 0.15;
var multX = 1.0;
var multY = 4.0;

var camRad = 550;
var camHoroAngle = 0;
var camVertAngle = 0;
var up = new THREE.Vector3(0, 1, 0);
var viewPt = new THREE.Vector3(0, 0, 0);

////////////////////////////////////////////////////

var trainingInput;
var trainingTarget;
var testingInput;
var testingTarget;

var trainingSet;
var testingSet;

var sphereBufferLength = 0;
var tubeBufferLength = 0;

init();

function init() {
	window.addEventListener('keydown', onKeyDown, false);
	window.addEventListener('keyup', onKeyUp, false);
	window.addEventListener('resize', onWindowResize, false);

	canvas = document.getElementById('canvas');
    
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(30, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
	camera.position.x = camRad;
	camera.position.y = 0;
	camera.position.z = 0;
	camera.lookAt(0,0,0);
	
    renderer = new THREE.WebGLRenderer({antialias: true, depth: true});
	renderer.setClearColor(0x141414);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

	canvas.appendChild( renderer.domElement );
	
	stats = new Stats();
	//canvas.appendChild( stats.dom );

	sampleIndexing.length = 7000;
	if(set_order == 0){
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = i;
		}
	}else if(set_order == 1){
		var tmp = Math.floor((Math.random()*7000));
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = (i+tmp)%sampleIndexing.length;
		}
	}else if(set_order == 2){
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = i;
		}
		var tmp;
		var rand;
		for(var i=0; i<sampleIndexing.length; i++){
			rand = Math.floor((Math.random()*7000-i))+i;
			tmp = sampleIndexing[i];
			sampleIndexing[i] = sampleIndexing[rand];
			sampleIndexing[rand] = tmp;
		}
	}

	for(var i=0; i<layer_sizes.length; i++){
		visibleW[i] = true;
		visibleX[i] = true;
		visibleB[i] = true;
		visibleY[i] = true;
	}

	setupBuffers();
	setupNetwork();
	//modifyBuffers();
	renderer.render(scene, camera);
	tick();
}

function setupApply(){
	scene.remove(mesh);
	mesh = null;

	layer_sizes.length = 0;
	layer_sizes.push(100);
	$('.layers').each(function() {
		layer_sizes.push(parseInt($(this).text()));
	});
	layer_sizes.push(1);

	if($('#radio-000').is(':checked')){
		biases = true;
	}else if($('#radio-001').is(':checked')){
		biases = false;
	}

	if($('#radio-010').is(':checked')){
		processing = 0;
	}else if($('#radio-011').is(':checked')){
		processing = 1;
	}

	if($('#radio-020').is(':checked')){
		set_order = 0;
	}else if($('#radio-021').is(':checked')){
		set_order = 1;
	}else if($('#radio-022').is(':checked')){
		set_order = 2;
	}

	learning_rate = parseFloat($("#learningrate").val());

	if(set_order == 0){
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = i;
		}
	}else if(set_order == 1){
		var tmp = Math.floor((Math.random()*7000));
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = (i+tmp)%sampleIndexing.length;
		}
	}else if(set_order == 2){
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = i;
		}
		var tmp;
		var rand;
		for(var i=0; i<sampleIndexing.length; i++){
			rand = Math.floor((Math.random()*7000-i))+i;
			tmp = sampleIndexing[i];
			sampleIndexing[i] = sampleIndexing[rand];
			sampleIndexing[rand] = tmp;
		}
	}

	$(".templayer").remove();

	for(var i=1; i<layer_sizes.length-1; i++){
		$('\
			<div class="templayer switch-container">\
				<label class="switch view-switch">\
					<input class="switch__native-control componentvisibility" type="checkbox" name="checkboxs1" checked>\
					<span class="checkbox__outer-square"></span>\
					<span class="checkbox__inner-mark"></span>\
				</label>\
				<label class="switch view-switch">\
					<input class="switch__native-control componentvisibility" type="checkbox" name="checkboxs1" checked>\
					<span class="checkbox__outer-square"></span>\
					<span class="checkbox__inner-mark"></span>\
				</label>\
				<label class="switch view-switch">\
					<input class="switch__native-control componentvisibility" type="checkbox" name="checkboxs1" checked>\
					<span class="checkbox__outer-square"></span>\
					<span class="checkbox__inner-mark"></span>\
				</label>\
				<label class="switch view-switch">\
					<input class="switch__native-control componentvisibility" type="checkbox" name="checkboxs1" checked>\
					<span class="checkbox__outer-square"></span>\
					<span class="checkbox__inner-mark"></span>\
				</label>\
				<p class="switch-text">Hidden Layer '+i+'</p>\
			</div>\
		').insertBefore("#outputlayer");
	}

	for(var i=0; i<layer_sizes.length; i++){
		visibleW[i] = true;
		visibleX[i] = true;
		visibleB[i] = true;
		visibleY[i] = true;
	}

	setupBuffers();
	setupNetwork();
	modifyBuffers();
	renderer.render(scene, camera);
}

/////////////////////////

function runStart(){
	trainingSize = parseInt(document.getElementById("training-size").value);
	iterationCount = parseInt(document.getElementById("iteration-count").value);
}

function runStop(){
	iterationCount = 0;
}

function runReset(){
	iterationCount = 0;
	setupNetwork();
	modifyBuffers();
	renderer.render(scene, camera);
	document.getElementById("training-iteration-result").textContent = "no info";
	document.getElementById("training-misses-result").textContent = "no info";
	document.getElementById("training-cost-result").textContent = "no info";

	document.getElementById("testing-misses-result").textContent = "no info";
	document.getElementById("testing-cost-result").textContent = "no info";

	document.getElementById("response-sample-result").textContent = "no info";
	document.getElementById("response-miss-result").textContent = "no info";
	document.getElementById("response-accuracy-result").textContent = "no info";
}

function runTest(){
	testingSize = parseInt(document.getElementById("testing-size").value);
	preTestReset();
	for(testingSample=0; testingSample<testingSize; testingSample++){
		testNetwork();
	}
	modifyBuffers();
	renderer.render(scene, camera);
	document.getElementById("testing-misses-result").textContent = ((testingMisses * 100 / testingSize).toFixed(2)).toString()+"%"
	document.getElementById("testing-cost-result").textContent = ((testingCost / testingSize).toFixed(4)).toString();
}

function runResponse(){
	trainingSample = parseInt(document.getElementById("sample-num").value);
	trainingMisses = 0.0;
	trainingCost = 0.0;
	runNetwork();
	modifyBuffers();
	renderer.render(scene, camera);
	document.getElementById("response-sample-result").textContent = trainingSample.toString();
	document.getElementById("response-miss-result").textContent = trainingMisses.toString();
	document.getElementById("response-accuracy-result").textContent = (accuracy.toFixed(0)).toString();
	if(document.getElementById("response-increment").checked){
		document.getElementById("sample-num").value = trainingSample + 1;
	}
}

function runNormReset(){
	max_weight = 0;
	max_weight_change = 0;
	max_bias = 0;
	max_bias_change = 0;
}

function runApply(){
	if($('#radio-100').is(':checked')){
		back_prop = 0;
	}else if($('#radio-101').is(':checked')){
		back_prop = 1;
	}
}

//////////////////////////

function viewApply(){
	
	visibleW = [];
	visibleW.length = layer_sizes.length;
	visibleX = [];
	visibleX.length = layer_sizes.length;
	visibleB = [];
	visibleB.length = layer_sizes.length;
	visibleY = [];
	visibleY.length = layer_sizes.length;
	var arr = document.getElementsByClassName("componentvisibility");
	for(var i=0; i<arr.length; i+=4){
		visibleW[Math.floor(i/4)] = arr[i].checked;
		visibleX[Math.floor(i/4)] = arr[i+1].checked;
		visibleB[Math.floor(i/4)] = arr[i+2].checked;
		visibleY[Math.floor(i/4)] = arr[i+3].checked;
	}

	if($('#radio-200').is(':checked')){
		view_type = 0;
		console.log("view_type = 0");
	}else if($('#radio-201').is(':checked')){
		view_type = 1;
		console.log("view_type = 1");
	}

	multW = parseFloat(document.getElementById("multW").value) * 0.2;
	cutoffW = parseFloat(document.getElementById("cutoffW").value) * 0.2;
	multX = parseFloat(document.getElementById("multX").value) * 1.0;
	multY = parseFloat(document.getElementById("multY").value) * 4.0;

	modifyBuffers();
	renderer.render(scene, camera);
}

function onKeyDown(event){

	if(event.keyCode == "37"){
		camLeft = true;
	}
	if(event.keyCode == "39"){
		camRight = true;
	}
	if(event.keyCode == "38"){
		camUp = true;
	}
	if(event.keyCode == "40"){
		camDown = true;
	}
}

function onKeyUp(event){
	
	if(event.keyCode == "37"){
		camLeft = false;
	}
	if(event.keyCode == "39"){
		camRight = false;
	}
	if(event.keyCode == "38"){
		camUp = false;
	}
	if(event.keyCode == "40"){
		camDown = false;
	}
}

function onWindowResize( event ) {
	camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
	renderer.render( scene, camera );
}

function tick() {
	if(iterationCount > 0){
		preIterationReset();
		for(trainingSample=0; trainingSample<trainingSize; trainingSample++){
			preSampleReset();
			runNetwork();
			postSampleModify();
		}
		postIterationModify();
		iteration++;
		iterationCount--;
		modifyBuffers();
		renderer.render( scene, camera );
		document.getElementById("training-iteration-result").textContent = iteration.toString();
		document.getElementById("training-misses-result").textContent = ((trainingMisses * 100 / trainingSize).toFixed(2)).toString()+"%";
		document.getElementById("training-cost-result").textContent = ((trainingCost / trainingSize).toFixed(4)).toString();

		document.getElementById("testing-misses-result").textContent = "no info";
		document.getElementById("testing-cost-result").textContent = "no info";
	
		document.getElementById("response-sample-result").textContent = "no info";
		document.getElementById("response-miss-result").textContent = "no info";
		document.getElementById("response-accuracy-result").textContent = "no info";
		//console.log('iter: ' + iteration + ', m: ' + trainingMisses + ', c: ' + trainingCost.toFixed(3));
	}else if(camLeft || camRight || camUp || camDown){
		if(camLeft){
			camHoroAngle = (camHoroAngle + 0.02) % (2*Math.PI);
		}
		if(camRight){
			camHoroAngle = (camHoroAngle - 0.02) % (2*Math.PI);	
		}
		if(camUp){
			camVertAngle = Math.min(camVertAngle + 0.02, 0.45*Math.PI);
		}
		if(camDown){
			camVertAngle = Math.max(camVertAngle - 0.02, -0.45*Math.PI);
		}
		camera.position.x = camRad*Math.cos(camVertAngle)*Math.cos(camHoroAngle);
		camera.position.y = camRad*Math.sin(camVertAngle);
		camera.position.z = camRad*Math.cos(camVertAngle)*Math.sin(camHoroAngle);
		camera.lookAt(0,0,0);
		renderer.render( scene, camera );
	}
	
	stats.update();
    requestAnimationFrame(tick);
}

function setupBuffers() {

	sphereX.length = layer_sizes.length;
	sphereY.length = layer_sizes.length;
	topOffset.length = layer_sizes.length;
	rightOffset.length = layer_sizes.length;

	for(var i=0; i<layer_sizes.length; i++){
		sphereY[i] = [];
		sphereY[i].length = layer_sizes[i];
	}

	for(var i=1; i<layer_sizes.length; i++){
		sphereX[i] = [];
		topOffset[i] = [];
		rightOffset[i] = [];
		sphereX[i].length = layer_sizes[i];
		topOffset[i].length = layer_sizes[i-1];
		rightOffset[i].length = layer_sizes[i-1];
		for(var j=0; j<layer_sizes[i-1]; j++){
			topOffset[i][j] = [];
			rightOffset[i][j] = [];
			topOffset[i][j].length = layer_sizes[i];
			rightOffset[i][j].length = layer_sizes[i];
		}
	}

	var sphereCount = 0;
	var tubeCount = 0;

	var weightRad = 0.1;
	var biasRad = 0.1;
	if(!biases){
		biasRad = 0;
	}
	// var sphereRad = 2;  // (200/3.0)/Math.max(...layer_sizes);
	var tmp = 300 / (layer_sizes.length - 1);
	var biasGap = (tmp * 0.15);
	var weightGap = tmp - biasGap;
	var posZ = 150;

	var colTotal = Math.ceil(Math.sqrt(layer_sizes[0]));
	var rowTotal = Math.ceil(layer_sizes[0] / colTotal);

	var nodeGap = 0;
	var posX = 0;
	var posY = 0;
	
	if(colTotal >= rowTotal){
		nodeGap = 200 / colTotal;
		posX = -100 + (nodeGap / 2);
		posY = 100 - (nodeGap * (colTotal - rowTotal + 1) / 2);
	}else{
		nodeGap = 200 / rowTotal;
		posX = -100 + (nodeGap * (colTotal - rowTotal + 1) / 2);
		posY = 100 - (nodeGap / 2);
	}
	var startX = posX;
	var startY = posY;

	var colNum = 0;
	
	spherePositions = [];
	var sphereNormals = [];
	var numTriangles = sphereFromSubdivision(3, spherePositions, sphereNormals);
	sphereBufferLength = numTriangles*9;
	tubeBufferLength = 72;

	sphereCount += layer_sizes[0];
	for(var i=1; i<layer_sizes.length; i++){
		sphereCount += 2*layer_sizes[i];
		tubeCount += (layer_sizes[i-1] + 1) * layer_sizes[i];
	}
	var bufferSize = (sphereBufferLength * sphereCount) + (tubeBufferLength * tubeCount);

	//var positionArray = new Float32Array(bufferSize);
	//var colorArray = new Float32Array(bufferSize);
	var positionArray = [];
	positionArray.length = bufferSize;
	var colorArray = [];
	colorArray.length = bufferSize;
	
	for(var i=0; i<bufferSize; i++){
		colorArray[i] = baseLum;
	}

	var index = 0;
	
	for (var i=0; i<layer_sizes[0]; i++){

		for(var j=0; j<sphereBufferLength; j+=3){
			positionArray[index+j] = spherePositions[j] + posX;
			positionArray[index+j+1] = spherePositions[j+1] + posY;
			positionArray[index+j+2] = spherePositions[j+2] + posZ;
		}
		sphereY[0][i] = new THREE.Vector3(posX, posY, posZ);
		index += sphereBufferLength;

		colNum++;
		if(colNum >= colTotal){
			posX = startX;
			posY -= nodeGap;
			colNum = 0;
		}else{
			posX += nodeGap;
		}
	}
	posZ -= weightGap;

	for(var i=1; i<layer_sizes.length; i++){
		colTotal = Math.ceil(Math.sqrt(layer_sizes[i]));
		rowTotal = Math.ceil(layer_sizes[i] / colTotal);

		nodeGap = 200 / colTotal;
		posX = -100 + (nodeGap / 2);
		posY = 100 - (nodeGap * (colTotal - rowTotal + 1) / 2);
		startX = posX;
		startY = posY;
		colNum = 0;

		for(var j=0; j<layer_sizes[i]; j++){
			
			for(var k=0; k<sphereBufferLength; k+=3){
				positionArray[index+k] = spherePositions[k] + posX;
				positionArray[index+k+1] = spherePositions[k+1] + posY;
				positionArray[index+k+2] = spherePositions[k+2] + posZ;
			}
			sphereX[i][j] = new THREE.Vector3(posX, posY, posZ);
			index += sphereBufferLength;

			colNum++;
			if(colNum >= colTotal){
				posX = startX;
				posY -= nodeGap;
				colNum = 0;
			}else{
				posX += nodeGap;
			}
		}
		posZ -= biasGap;

		posX = startX;
		posY = startY;
		colNum = 0;
		for(var j=0; j<layer_sizes[i]; j++){
			
			for(var k=0; k<sphereBufferLength; k+=3){
				positionArray[index+k] = spherePositions[k] + posX;
				positionArray[index+k+1] = spherePositions[k+1] + posY;
				positionArray[index+k+2] = spherePositions[k+2] + posZ;
			}
			sphereY[i][j] = new THREE.Vector3(posX, posY, posZ);
			index += sphereBufferLength;

			colNum++;
			if(colNum >= colTotal){
				posX = startX;
				posY -= nodeGap;
				colNum = 0;
			}else{
				posX += nodeGap;
			}
		}
		posZ -= weightGap;
	}

	//var angle, hypo, vecX, vecY, vecZ;
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i-1]; j++){
			var start = sphereY[i-1][j];
			for(var k=0; k<layer_sizes[i]; k++){
				var end = sphereX[i][k];
				diff.set(end.x-start.x, end.y-start.y, end.z-start.z);
				diff.normalize();

				var angle = Math.asin(diff.y) + Math.PI/2;
				var hypo = Math.sqrt((diff.x * diff.x) + (diff.z * diff.z));
				var vecX = Math.cos(angle) * diff.x / hypo;
				var vecY = Math.sin(angle);
				var vecZ = Math.cos(angle) * diff.z / hypo;
				topTmp.set(vecX, vecY, vecZ);
				bottomTmp.set(-vecX, -vecY, -vecZ);
				topOffset[i][j][k] = new THREE.Vector3(vecX, vecY, vecZ);

				angle = Math.asin(diff.x) + Math.PI/2;
				hypo = Math.sqrt((diff.y * diff.y) + (diff.z * diff.z));
				vecX = Math.sin(angle);
				vecY = Math.cos(angle) * diff.y / hypo;
				vecZ = Math.cos(angle) * diff.z / hypo;
				rightTmp.set(vecX, vecY, vecZ);
				leftTmp.set(-vecX, -vecY, -vecZ);
				rightOffset[i][j][k] = new THREE.Vector3(vecX, vecY, vecZ);

				topTmp.multiplyScalar(weightRad);
				bottomTmp.multiplyScalar(weightRad);
				rightTmp.multiplyScalar(weightRad);
				leftTmp.multiplyScalar(weightRad);

				modifySide(positionArray, index, start, end, topTmp, rightTmp);
				modifySide(positionArray, index+18, start, end, rightTmp, bottomTmp);
				modifySide(positionArray, index+36, start, end, bottomTmp, leftTmp);
				modifySide(positionArray, index+54, start, end, leftTmp, topTmp);

				index += tubeBufferLength;
			}
		}
		
		for(var j=0; j<layer_sizes[i]; j++){
			var start = sphereX[i][j];
			var end = sphereY[i][j];
			
			topTmp.set(0, 1, 0);
			bottomTmp.set(0, -1, 0);
			rightTmp.set(1, 0, 0);
			leftTmp.set(-1, 0, 0);

			topTmp.multiplyScalar(biasRad);
			bottomTmp.multiplyScalar(biasRad);
			rightTmp.multiplyScalar(biasRad);
			leftTmp.multiplyScalar(biasRad);

			modifySide(positionArray, index, start, end, topTmp, rightTmp);
			modifySide(positionArray, index+18, start, end, rightTmp, bottomTmp);
			modifySide(positionArray, index+36, start, end, bottomTmp, leftTmp);
			modifySide(positionArray, index+54, start, end, leftTmp, topTmp);

			index += tubeBufferLength;
		}
	}
	
	var geometry = new THREE.BufferGeometry();
	var material = new THREE.MeshBasicMaterial( { vertexColors: THREE.VertexColors, side: THREE.BackSide } );

	var positionAttribute = new THREE.Float32BufferAttribute(positionArray, 3);
	positionAttribute.dynamic = true;
	var colorAttribute = new THREE.Float32BufferAttribute(colorArray, 3);
	colorAttribute.dynamic = true;
	geometry.addAttribute( 'position', positionAttribute );
	geometry.addAttribute( 'color', colorAttribute );
	mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}

function modifyBuffers() {
	var index = 0;
	var tmp, tmp1, tmp2, start, end, offset;

	var positionArray = mesh.geometry.attributes.position.array;
	var colorArray = mesh.geometry.attributes.color.array;

	for(var i=0; i<layer_sizes[0]; i++){
		if(visibleY[0]){
			tmp1 = netY[0][i] * baseLum;
			tmp2 = Math.max(netY[0][i] * multY, 1);
		}else{
			tmp1 = 0;
			tmp2 = 0;
		}
		for(var j=0; j<sphereBufferLength; j+=3){
			colorArray[index + j] = baseLum - tmp1;
			colorArray[index + j + 1] = baseLum - tmp1;
			colorArray[index + j + 2] = baseLum;

			positionArray[index+j] = (spherePositions[j] * tmp2) + sphereY[0][i].x;
			positionArray[index+j+1] = (spherePositions[j+1] * tmp2) + sphereY[0][i].y;
			positionArray[index+j+2] = (spherePositions[j+2] * tmp2) + sphereY[0][i].z;
		}
		index += sphereBufferLength;
	}
	
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i]; j++){
			if(visibleX[i]){
				if(view_type == 0){
					tmp1 = netX[i][j] * baseLum / max_x;
					tmp2 = Math.max(Math.abs(netX[i][j] * multX), 1);
				}else if(view_type == 1){
					tmp1 = netD[i][j] * baseLum / max_d;
					tmp2 = Math.max(Math.abs(netD[i][j] * multX), 1);
				}
			}else{
				tmp1 = 0;
				tmp2 = 0;
			}
			if(tmp1 >= 0.0){
				for(var k=0; k<sphereBufferLength; k+=3){
					colorArray[index + k] = baseLum - tmp1;
					colorArray[index + k + 1] = baseLum;
					colorArray[index + k + 2] = baseLum - tmp1;

					positionArray[index+k] = (spherePositions[k] * tmp2) + sphereX[i][j].x;
					positionArray[index+k+1] = (spherePositions[k+1] * tmp2) + sphereX[i][j].y;
					positionArray[index+k+2] = (spherePositions[k+2] * tmp2) + sphereX[i][j].z;
				}
			}else{
				for(var k=0; k<sphereBufferLength; k+=3){
					colorArray[index + k] = baseLum;
					colorArray[index + k + 1] = baseLum + tmp1;
					colorArray[index + k + 2] = baseLum + tmp1;

					positionArray[index+k] = (spherePositions[k] * tmp2) + sphereX[i][j].x;
					positionArray[index+k+1] = (spherePositions[k+1] * tmp2) + sphereX[i][j].y;
					positionArray[index+k+2] = (spherePositions[k+2] * tmp2) + sphereX[i][j].z;
				}
			}
			index += sphereBufferLength;
		}
		
		for(var j=0; j<layer_sizes[i]; j++){
			if(visibleY[i]){
				tmp1 = netY[i][j] * baseLum;
				tmp2 = Math.max(netY[i][j] * multY, 1);
			}else{
				tmp1 = 0;
				tmp2 = 0;
			}
			for(var k=0; k<sphereBufferLength; k+=3){
				colorArray[index + k] = baseLum - tmp1;
				colorArray[index + k + 1] = baseLum - tmp1;
				colorArray[index + k + 2] = baseLum;

				positionArray[index+k] = (spherePositions[k] * tmp2) + sphereY[i][j].x;
				positionArray[index+k+1] = (spherePositions[k+1] * tmp2) + sphereY[i][j].y;
				positionArray[index+k+2] = (spherePositions[k+2] * tmp2) + sphereY[i][j].z;
			}
			index += sphereBufferLength;
		}
	}
	
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i-1]; j++){
			start = sphereY[i-1][j];
			for(var k=0; k<layer_sizes[i]; k++){
				if(visibleW[i]){
					if(view_type == 0){
						if(netW[i][j][k] >= 0){
							tmp = Math.max((netW[i][j][k] * multW) - cutoffW, 0) / ((max_weight * multW) - cutoffW) * baseLum;
						}else{
							tmp = Math.min((netW[i][j][k] * multW) + cutoffW, 0) / ((max_weight * multW) - cutoffW) * baseLum;
						}
					}else if(view_type == 1){
						if(netW[i][j][k] >= 0){
							tmp = Math.max((netWChange[i][j][k] * multW) - cutoffW, 0) / ((max_weight_change * multW) - cutoffW) * baseLum;
						}else{
							tmp = Math.min((netWChange[i][j][k] * multW) + cutoffW, 0) / ((max_weight_change * multW) - cutoffW) * baseLum;
						}
					}
					
				}else{
					tmp = 0;
				}
				if(tmp >= 0.0){
					for(var l=0; l<tubeBufferLength; l+=3){
						colorArray[index + l] = baseLum - tmp;
						colorArray[index + l + 1] = baseLum;
						colorArray[index + l + 2] = baseLum - tmp;
					}
				}else{
					for(var l=0; l<tubeBufferLength; l+=3){
						colorArray[index + l] = baseLum;
						colorArray[index + l + 1] = baseLum + tmp;
						colorArray[index + l + 2] = baseLum + tmp;
					}
				}

				end = sphereX[i][k];
				
				offset = topOffset[i][j][k];
				topTmp.set(offset.x, offset.y, offset.z);
				bottomTmp.set(-offset.x, -offset.y, -offset.z);

				offset = rightOffset[i][j][k];
				rightTmp.set(offset.x, offset.y, offset.z);
				leftTmp.set(-offset.x, -offset.y, -offset.z);

				if(visibleW[i]){
					if(view_type == 0){
						tmp = Math.abs(netW[i][j][k]) * multW;
					}else if(view_type == 1){
						tmp = Math.abs(netWChange[i][j][k]) * multW;
					}

					if(tmp < cutoffW){
						tmp = 0;
					}
				}else{
					tmp = 0;
				}

				topTmp.multiplyScalar(tmp);
				bottomTmp.multiplyScalar(tmp);
				rightTmp.multiplyScalar(tmp);
				leftTmp.multiplyScalar(tmp);

				modifySide(positionArray, index, start, end, topTmp, rightTmp);
				modifySide(positionArray, index+18, start, end, rightTmp, bottomTmp);
				modifySide(positionArray, index+36, start, end, bottomTmp, leftTmp);
				modifySide(positionArray, index+54, start, end, leftTmp, topTmp);

				index += tubeBufferLength;
			}
		}
		
		for(var j=0; j<layer_sizes[i]; j++){
			if(biases){
				if(visibleB[i]){
					if(view_type == 0){
						if(netB[i][j] >= 0){
							tmp = Math.max((netB[i][j] * multW) - cutoffW, 0) / ((max_bias * multW) - cutoffW) * baseLum;
						}else{
							tmp = Math.min((netB[i][j] * multW) + cutoffW, 0) / ((max_bias * multW) - cutoffW) * baseLum;
						}
					}else if(view_type == 1){
						if(netB[i][j] >= 0){
							tmp = Math.max((netBChange[i][j] * multW) - cutoffW, 0) / ((max_bias_change * multW) - cutoffW) * baseLum;
						}else{
							tmp = Math.min((netBChange[i][j] * multW) + cutoffW, 0) / ((max_bias_change * multW) - cutoffW) * baseLum;
						}
					}
					
				}else{
					tmp = 0;
				}
				
				if(tmp >= 0.0){
					for(var k=0; k<tubeBufferLength; k+=3){
						colorArray[index + k] = baseLum - tmp;
						colorArray[index + k + 1] = baseLum;
						colorArray[index + k + 2] = baseLum - tmp;
					}
				}else{
					for(var k=0; k<tubeBufferLength; k+=3){
						colorArray[index + k] = baseLum;
						colorArray[index + k + 1] = baseLum + tmp;
						colorArray[index + k + 2] = baseLum + tmp;
					}
				}

				start = sphereX[i][j];
				end = sphereY[i][j];

				topTmp.set(0, 1, 0);
				bottomTmp.set(0, -1, 0);
				rightTmp.set(1, 0, 0);
				leftTmp.set(-1, 0, 0);

				if(visibleB[i]){
					if(view_type == 0){
						tmp = Math.abs(netB[i][j]) * multW;
					}else if(view_type == 1){
						tmp = Math.abs(netBChange[i][j]) * multW;
					}
					
					if(tmp < cutoffW){
						tmp = 0;
					}
				}else{
					tmp = 0;
				}

				topTmp.multiplyScalar(tmp);
				bottomTmp.multiplyScalar(tmp);
				rightTmp.multiplyScalar(tmp);
				leftTmp.multiplyScalar(tmp);

				modifySide(positionArray, index, start, end, topTmp, rightTmp);
				modifySide(positionArray, index+18, start, end, rightTmp, bottomTmp);
				modifySide(positionArray, index+36, start, end, bottomTmp, leftTmp);
				modifySide(positionArray, index+54, start, end, leftTmp, topTmp);
			}
			index += tubeBufferLength;
		}
	}
	mesh.geometry.attributes.position.needsUpdate = true;
	mesh.geometry.attributes.color.needsUpdate = true;
}

function modifyOffset(positionArray, index, base, offset){
	positionArray[index] = base.x + offset.x;
	positionArray[index+1] = base.y + offset.y;
	positionArray[index+2] = base.z + offset.z;
}

function modifySide(positionArray, index, start, end, offsetA, offsetB){
	modifyOffset(positionArray, index, start, offsetA);
	modifyOffset(positionArray, index+3, end, offsetA);
	modifyOffset(positionArray, index+6, start, offsetB);

	modifyOffset(positionArray, index+9, end, offsetB);
	modifyOffset(positionArray, index+12, start, offsetB);
	modifyOffset(positionArray, index+15, end, offsetA);
}

function setupNetwork(){

	// get training data from local webserver
	var rawFile = new XMLHttpRequest();
    rawFile.open("GET", 'input_data/MNIST/test.txt', false);
    rawFile.onreadystatechange = function (){
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
				var rawText = rawFile.responseText;
				console.log(rawText);
				//trainingInput = [];
				//trainingInput.length = 
				console.log(rawText[0].toString('hex'));
				console.log(rawText[1]);
				console.log(rawText[2]);
				console.log(rawText[3]);
				/*
				for(var i=0; i<trainingSet.length; i++){
					trainingSet[i] = trainingSet[i].split(',');
				}
				*/
            }
        }
    }
	rawFile.send(null);
	
	// get testing data from local webserver
	rawFile = new XMLHttpRequest();
    rawFile.open("GET", 'mushroom-testing.txt', false);
    rawFile.onreadystatechange = function (){
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
				var rawText = rawFile.responseText;
				testingSet = rawText.split('\n');
				for(var i=0; i<testingSet.length; i++){
					testingSet[i] = testingSet[i].split(',');
				}
            }
        }
    }
	rawFile.send(null);
	
	netX.length = layer_sizes.length;
	netY.length = layer_sizes.length;
	netD.length = layer_sizes.length;

	netW.length = layer_sizes.length;
	netWPrev.length = layer_sizes.length;
	netWChange.length = layer_sizes.length;
	netWChangePrev.length = layer_sizes.length;
	netWMod.length = layer_sizes.length;

	netB.length = layer_sizes.length;
	netBPrev.length = layer_sizes.length;
	netBChange.length = layer_sizes.length;
	netBChangePrev.length = layer_sizes.length;
	netBMod.length = layer_sizes.length;

	netT.length = layer_sizes[layer_sizes.length-1];

	max_weight = 0.001;
	max_weight_change = 0.001;
	max_bias = 0.001;
	max_bias_change = 0.001;

	randomSample = Math.floor((Math.random()*7000));

	// allocate the two dimensional arrays excluding the first layer
	for(var i=1; i<layer_sizes.length; i++){
		netX[i] = [];
		netD[i] = [];

		netX[i].length = layer_sizes[i];
		netD[i].length = layer_sizes[i];

		for(var j=0; j<layer_sizes[i]; j++){
			netX[i][j] = 0.0;
			netD[i][j] = 0.0;
		}
	}

	// allocate the two dimensional array for the node outputs, includes the first layer
	for(var i=0; i<layer_sizes.length; i++){
		netY[i] = [];
		netY[i].length = layer_sizes[i];
		for(var j=0; j<layer_sizes[i]; j++){
			netY[i][j] = 0.0;
		}
	}

	// allocate the three dimensional array for weights
	for(var i=1; i<layer_sizes.length; i++){
		netW[i] = [];
		netWPrev[i] = [];
		netWChange[i] = [];
		netWChangePrev[i] = [];
		netWMod[i] = [];
		
		netW[i].length = layer_sizes[i-1];
		netWPrev[i].length = layer_sizes[i-1];
		netWChange[i].length = layer_sizes[i-1];
		netWChangePrev[i].length = layer_sizes[i-1];
		netWMod[i].length = layer_sizes[i-1];

		for(var j=0; j<layer_sizes[i-1]; j++){
			netW[i][j] = [];
			netWPrev[i][j] = [];
			netWChange[i][j] = [];
			netWChangePrev[i][j] = [];
			netWMod[i][j] = [];

			netW[i][j].length = layer_sizes[i];
			netWPrev[i][j].length = layer_sizes[i];
			netWChange[i][j].length = layer_sizes[i];
			netWChangePrev[i][j].length = layer_sizes[i];
			netWMod[i][j].length = layer_sizes[i];

			for(var k=0; k<layer_sizes[i]; k++){
				var rand = (Math.random()*2) - 1;
				if(Math.abs(rand) > max_weight){
					max_weight = Math.abs(rand);
				}
				netW[i][j][k] = rand;
				netWPrev[i][j][k] = 0.0;
				netWChange[i][j][k] = 0.0;
				netWChangePrev[i][j][k] = 0.0;
				netWMod[i][j][k] = 0.0;
			}
		}
	}

	if(biases){
		for(var i=1; i<layer_sizes.length; i++){
			netB[i] = [];
			netBPrev[i] = [];
			netBChange[i] = [];
			netBChangePrev[i] = [];
			netBMod[i] = [];
	
			netB[i].length = layer_sizes[i];
			netBPrev[i].length = layer_sizes[i];
			netBChange[i].length = layer_sizes[i];
			netBChangePrev[i].length = layer_sizes[i];
			netBMod[i].length = layer_sizes[i];
	
			for(var j=0; j<layer_sizes[i]; j++){	
				var rand = (Math.random()*2) - 1;
				if(Math.abs(rand) > max_bias){
					max_bias = Math.abs(rand);
				}
				netB[i][j] = rand;
				netBPrev[i][j] = 0.0;
				netBChange[i][j] = 0.0;
				netBChangePrev[i][j] = 0.0;
				netBMod[i][j] = 0.0;
			}
		}
	}

	iteration = 0;
	trainingSample = 0;
	trainingCost = 0.0;
	trainingMisses = 0;
	testingCost = 0.0;
	testingMisses = 0;
	accuracy = 0;
}

function preIterationReset(){
	trainingMisses = 0;
	trainingCost = 0.0;
}

function preSampleReset(){
	if(processing == 0){
		max_weight = 0;
		max_weight_change = 0;
		max_bias = 0;
		max_bias_change = 0;
	}
}

function postSampleModify(){
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i-1]; j++){
			for(var k=0; k<layer_sizes[i]; k++){
				if(processing == 0){
					netW[i][j][k] += netWChange[i][j][k];
					if(Math.abs(netW[i][j][k]) > max_weight){
						max_weight = Math.abs(netW[i][j][k]);
					}
				}else if(processing == 1){
					netWMod[i][j][k] += netWChange[i][j][k];
				}
				//netWChange[i][j][k] = 0;
			}
		}
		if(biases){
			for(var j=0; j<layer_sizes[i]; j++){
				if(processing == 0){
					netB[i][j] += netBChange[i][j];
					if(Math.abs(netB[i][j]) > max_bias){
						max_bias = Math.abs(netB[i][j]);
					}
				}else if(processing == 1){
					netBMod[i][j] += netBChange[i][j];
				}
				//netBChange[i][j] = 0;
			}
		}
	}
}

function postIterationModify(){

	if(set_order == 1){
		var tmp = Math.floor((Math.random()*7000));
		for(var i=0; i<sampleIndexing.length; i++){
			sampleIndexing[i] = (i+tmp)%sampleIndexing.length;
		}
	}else if(set_order == 2){
		var tmp;
		var rand;
		for(var i=0; i<sampleIndexing.length; i++){
			rand = Math.floor((Math.random()*7000-i))+i;
			tmp = sampleIndexing[i];
			sampleIndexing[i] = sampleIndexing[rand];
			sampleIndexing[rand] = tmp;
		}
	}

	if(processing == 1){

		max_weight = 0;
		max_weight_change = 0;
		max_bias = 0;
		max_bias_change = 0;

		for(var i=1; i<layer_sizes.length; i++){
			// modify weights and clear weight gradients
			for(var j=0; j<layer_sizes[i-1]; j++){
				for(var k=0; k<layer_sizes[i]; k++){
					netW[i][j][k] += netWMod[i][j][k];
					netWChange[i][j][k] = netWMod[i][j][k];
					if(Math.abs(netW[i][j][k]) > max_weight){
						max_weight = Math.abs(netW[i][j][k]);
					}
					if(Math.abs(netWChange[i][j][k]) > max_weight_change){
						max_weight_change = Math.abs(netWChange[i][j][k]);
					}
					netWChangePrev[i][j][k] = netWChange[i][j][k];
					netWMod[i][j][k] = 0.0;
				}
			}
			// modify biases and clear bias gradients
			if(biases){
				for(var j=0; j<layer_sizes[i]; j++){
					netB[i][j] += netBMod[i][j];
					netBChange[i][j] = netBMod[i][j];
					if(Math.abs(netB[i][j]) > max_bias){
						max_bias = Math.abs(netB[i][j]);
					}
					if(Math.abs(netBChange[i][j]) > max_bias_change){
						max_bias_change = Math.abs(netBChange[i][j]);
					}
					netBChangePrev[i][j] = netBChange[i][j];
					netBMod[i][j] = 0.0;
				}
			}
		}
	}
}

function runNetwork(){
	
	for(var i=0; i<layer_sizes[layer_sizes.length-1]; i++){
		netT[i] = trainingSet[sampleIndexing[trainingSample]][i];
	}
	for(var i=0; i<layer_sizes[0]; i++){
		netY[0][i] = trainingSet[sampleIndexing[trainingSample]][i+layer_sizes[layer_sizes.length-1]];
	}

	max_x = 0;
	max_d = 0;
	// netW[layer number][node_start][node_end]
	// netXYDB[layer number][node]
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i]; j++){
			netX[i][j] = 0;
			for(var k=0; k<layer_sizes[i-1]; k++){
				netX[i][j] += netW[i][k][j] * netY[i-1][k];
			}
			if(Math.abs(netX[i][j]) > max_x){
				max_x = Math.abs(netX[i][j]);
			}
			var tmp = netX[i][j];
			if(biases){
				tmp += netB[i][j];
			}
			netY[i][j] = 1.0/(1.0 + Math.exp(-tmp));
		}
	}

	var finalT;
	var finalY;
	for(var i=0; i<layer_sizes[layer_sizes.length-1]; i++){
		finalT = netT[i];
		finalY = netY[layer_sizes.length-1][i];
		// find costs and misses
		trainingCost += Math.pow(finalT-finalY, 2) / 2;
		if((finalY < 0.5 && finalT == 1) || (finalY > 0.5 && finalT == 0)){
			trainingMisses++;
		}
		accuracy = (1 - Math.abs(finalT-finalY)) * 100;
		// calculate initial derivatives
		netD[layer_sizes.length-1][i] = finalY*(1-finalY);
		//netD[layer_sizes.length-1][i] = y*(1-y)*(y-t);

		if(Math.abs(netD[layer_sizes.length-1][i]) > max_d){
			max_d = Math.abs(netD[layer_sizes.length-1][i]);
		}
	}

	// calculate derivatives for each x
	for(var i=layer_sizes.length-2; i>0; i--){
		for(var j=0; j<layer_sizes[i]; j++){
			netD[i][j] = 0.0;
			for(var k=0; k<layer_sizes[i+1]; k++){
				netD[i][j] += netW[i+1][j][k] * netD[i+1][k];
			}
			var y = netY[i][j];
			netD[i][j] *= y*(1-y);
			if(Math.abs(netD[i][j]) > max_d){
				max_d = Math.abs(netD[i][j]);
			}
		}
	}

	var targetDiff = (finalT-finalY);
	for(var i=layer_sizes.length-1; i>0; i--){
		// calculate weight gradients
		for(var j=0; j<layer_sizes[i-1]; j++){
			for(var k=0; k<layer_sizes[i]; k++){
				var derivative = netD[i][k];
				if(back_prop == 0){
					netWChange[i][j][k] = targetDiff * netY[i-1][j] * derivative * learning_rate;
				}else if(back_prop == 1){
					if(derivative >= 0){
						derivative = Math.max(derivative, 0.05);
					}else{
						derivative = Math.min(derivative, -0.05);
					}
					netWChange[i][j][k] = targetDiff * netY[i-1][j] / derivative * learning_rate;
				}
				if(Math.abs(netWChange[i][j][k]) > max_weight_change){
					max_weight_change = Math.abs(netWChange[i][j][k]);
				}
			}
		}
		// calculate bias gradients
		if(biases){
			for(var j=0; j<layer_sizes[i]; j++){
				var derivative = netD[i][j];
				if(back_prop == 0){
					netBChange[i][j] = targetDiff * derivative * learning_rate;
				}else if(back_prop == 1){
					if(derivative >= 0){
						derivative = Math.max(derivative, 0.05);
					}else{
						derivative = Math.min(derivative, -0.05);
					}
					netBChange[i][j] = targetDiff / derivative * learning_rate;
				}
				if(Math.abs(netBChange[i][j]) > max_bias_change){
					max_bias_change = Math.abs(netBChange[i][j]);
				}
			}
		}
	}
}

function preTestReset(){
	testingMisses = 0.0;
	testingCost = 0.0;
}

function testNetwork(){
	
	for(var i=0; i<layer_sizes[layer_sizes.length-1]; i++){
		netT[i] = testingSet[testingSample % 1000][i];
	}
	for(var i=0; i<layer_sizes[0]; i++){
		netY[0][i] = testingSet[testingSample % 1000][i+layer_sizes[layer_sizes.length-1]];
	}

	// netW[layer number][node_start][node_end]
	// netXYDB[layer number][node]
	for(var i=1; i<layer_sizes.length; i++){
		for(var j=0; j<layer_sizes[i]; j++){
			netX[i][j] = 0;
			for(var k=0; k<layer_sizes[i-1]; k++){
				netX[i][j] += netW[i][k][j] * netY[i-1][k];
			}
			var tmp = netX[i][j];
			if(biases){
				tmp += netB[i][j];
			}
			netY[i][j] = 1.0/(1.0 + Math.exp(-tmp));
		}
	}

	for(var i=0; i<layer_sizes[layer_sizes.length-1]; i++){
		var finalT = netT[i];
		var finalY = netY[layer_sizes.length-1][i];
		// find costs and misses
		testingCost += Math.pow(finalT-finalY, 2) / 2;
		if((finalY < 0.5 && finalT == 1) || (finalY > 0.5 && finalT == 0)){
			testingMisses++;
		}
		accuracy = (1 - Math.abs(finalT-finalY)) * 100;
	}
}
