// A script for controlling the UI

var n_particles = 0;

function AddRandomParticles(){
	let number_new_particles = document.querySelector('#number-new-particles').value;
	
	for (let i = 0; i< number_new_particles; i++) AddRandomParticle();
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
	
	// Radius
	new_particle.appendChild(addAttribute(Math.random()/4, true));
	
	document.querySelector('#particle-list').appendChild(new_particle);
	
	n_particles += 1;
	document.querySelector('#number-particles').textContent = n_particles;
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
