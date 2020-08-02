// A script for controlling the UI

var n_particles = 0;



function AddRandomParticles(){
	var number_new_particles = document.querySelector('#number-new-particles').value;
	
	for (var i=0; i<number_new_particles; i++) AddRandomParticle();
}

function AddRandomParticle(){
	var new_particle = document.createElement('tr');

	// Particle Number
	new_particle.appendChild(addAttribute(n_particles, false));

	// Position X
	new_particle.appendChild(addAttribute(2*Math.random()-1, true));
	// Position Y
	new_particle.appendChild(addAttribute(2*Math.random()-1, true));
	
	// Velocity X
	new_particle.appendChild(addAttribute(Math.random()-1/2, true));
	// Velocity Y
	new_particle.appendChild(addAttribute(Math.random()-1/2, true));
	
	// Remove Button
	new_particle.appendChild(addButton("Remove", "RemoveParticle(this);"));
	
	document.querySelector('#particle-list').appendChild(new_particle);
	
	n_particles += 1;
	updateNParticlesLabel();
}

function addAttribute(value, editable){
	var new_attribute = document.createElement('td');
	if (editable){
		var new_input = document.createElement('input');
		new_input.setAttribute('type',"number");
		new_input.value = value;
		new_attribute.appendChild(new_input);
	}
	else new_attribute.textContent = value;
	return new_attribute
}

function addButton(text, function_string){
	var new_attribute = document.createElement('td');
	var remove_button = document.createElement('button');
	remove_button.setAttribute('onclick',function_string);
	remove_button.textContent = text;
	new_attribute.appendChild(remove_button);
	return new_attribute
}



function RemoveParticle(button){
	var row = button.parentNode.parentNode;
	row.parentNode.removeChild(row);
	n_particles -= 1;

	updateTableNumbering();
	updateNParticlesLabel();
}

function ClearParticles(){
	document.querySelector('#particle-list').innerHTML = '';
	n_particles = 0;
	updateNParticlesLabel();
}


function updateTableNumbering(){
	var particle_table = document.querySelector('#particle-table');
	for (var i=1; i < particle_table.rows.length; i++){
		particle_table.rows[i].cells[0].textContent = i-1;
	}
}

function updateNParticlesLabel(){
	document.querySelector('#number-particles').textContent = n_particles;
}
