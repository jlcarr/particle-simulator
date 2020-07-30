# particle-simulator
A WebGL project to simulate classical physics particles.

## Approach:
Parameters:
- **N**: The number of particles
- **dim**: (=2) The dimensionality of the problem
- **pos**: (N * dim) The positions of each particle
- **vel**: (N * dim) The velocities of each particle

1. Define the initial values for the parameters of the simulation
2. Construct the buffers and compile the shader programs
3. Loop rendering frames
   1. Physics timestep computations
      1. Compute the time delta
      2. Compute classical gravitational and electric impulses (TODO)
      3. Compute inter-particle collision impulses
      4. Compute boundary collision impulses
      5. Compute position updates
   2. Draw
      1. Draw the state report
      2. Draw the particle positions

### Dynamics Computations
#### N-Body Simulations
https://en.wikipedia.org/wiki/N-body_simulation  
https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation  
https://en.wikipedia.org/wiki/Coulomb%27s_law  
https://en.wikipedia.org/wiki/Gravitational_constant  
https://en.wikipedia.org/wiki/Coulomb_constant  
The equations of motion are simple:  
![\frac{\mathrm{d} \vec{x}_i}{\mathrm{d} t} = \vec{v}_i](https://render.githubusercontent.com/render/math?math=%5Cfrac%7B%5Cmathrm%7Bd%7D%20%5Cvec%7Bx%7D_i%7D%7B%5Cmathrm%7Bd%7D%20t%7D%20%3D%20%5Cvec%7Bv%7D_i)  
![\frac{\mathrm{d} \vec{v}_i}{\mathrm{d} t} = \sum_{j \neq i} \left (  \frac{k_e q_j q_i-G m_j m_i}{m_i \left \| \vec{x}_i - \vec{x}_j \right \| ^3} \right ) \left ( \vec{x}_i - \vec{x}_j \right )](https://render.githubusercontent.com/render/math?math=%5Cfrac%7B%5Cmathrm%7Bd%7D%20%5Cvec%7Bv%7D_i%7D%7B%5Cmathrm%7Bd%7D%20t%7D%20%3D%20%5Csum_%7Bj%20%5Cneq%20i%7D%20%5Cleft%20(%20%20%5Cfrac%7Bk_e%20q_j%20q_i-G%20m_j%20m_i%7D%7Bm_i%20%5Cleft%20%5C%7C%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20%5C%7C%20%5E3%7D%20%5Cright%20)%20%5Cleft%20(%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20))  
Where:  
- ![\vec{x}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bx%7D_i) is the positon vector of particle i
- ![\vec{v}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bv%7D_i) is the velocity vector of particle i
- ![m_i](https://render.githubusercontent.com/render/math?math=m_i) is the mass of particle i
- ![q_i](https://render.githubusercontent.com/render/math?math=q_i) is the electric charge of particle i
- ![G](https://render.githubusercontent.com/render/math?math=G) is the universal gravitational constant
- ![k_e](https://render.githubusercontent.com/render/math?math=k_e) is Coulomb's constant

#### Numerical Solutions
https://en.wikipedia.org/wiki/Numerical_methods_for_ordinary_differential_equations  
https://en.wikipedia.org/wiki/Euler_method  
Since the equations of motion are a system of first order ordinary differential equations, they can be solved numerically in real time using numerical integration techniques  
The most basic method is the Euler method:  
![\vec{x}(t+\mathrm{d} t) = \vec{x}(t) + \vec{v}(t) \mathrm{d} t](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bx%7D(t%2B%5Cmathrm%7Bd%7D%20t)%20%3D%20%5Cvec%7Bx%7D(t)%20%2B%20%5Cvec%7Bv%7D(t)%20%5Cmathrm%7Bd%7D%20t)  
Where:  
- ![\vec{x}(t)](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bx%7D(t)) is a vector-valued quantity (e.g. positon) at time t
- ![\vec{v}(t)](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bv%7D(t)) is a the time dertivative of said vector-valued quantity (e.g. velocity) at time t
- ![\mathrm{d} t](https://render.githubusercontent.com/render/math?math=%5Cmathrm%7Bd%7D%20t) is the finite time delta used (assumed to be small enough to approximate an infinitesimal)

#### Collisions
https://en.wikipedia.org/wiki/Collision  
https://en.wikipedia.org/wiki/Elastic_collision  
Collisions between particles may either be perfectly elastic, in which no energy is lost, or inelastic in which some energy is lost as heat.  
For the purposes of this simulation perfectly elastic collisions shall be used:  
![\Delta \vec{v}_i = - \frac{2 m_i}{m_i + m_j} \frac{\left \langle \vec{x}_i - \vec{x}_j, \vec{v}_i - \vec{v}_j \right \rangle}{\left \| \vec{x}_i - \vec{x}_j \right \|^2} \left ( \vec{x}_i - \vec{x}_j \right )](https://render.githubusercontent.com/render/math?math=%5CDelta%20%5Cvec%7Bv%7D_i%20%3D%20-%20%5Cfrac%7B2%20m_i%7D%7Bm_i%20%2B%20m_j%7D%20%5Cfrac%7B%5Cleft%20%5Clangle%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%2C%20%5Cvec%7Bv%7D_i%20-%20%5Cvec%7Bv%7D_j%20%5Cright%20%5Crangle%7D%7B%5Cleft%20%5C%7C%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20%5C%7C%5E2%7D%20%5Cleft%20(%20%5Cvec%7Bx%7D_i%20-%20%5Cvec%7Bx%7D_j%20%5Cright%20))  
Where:  
- ![\vec{x}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bx%7D_i) is the positon vector of particle i
- ![\vec{v}_i](https://render.githubusercontent.com/render/math?math=%5Cvec%7Bv%7D_i) is the velocity vector of particle i
- ![m_i](https://render.githubusercontent.com/render/math?math=m_i) is the mass of particle i

**Note**: Improper handling of collisions can easily lead to numerical instabilties: leaks in momentum violate converation of momentum, which propagates across the system by entropy, leading to further leakages causing an exponential  explosion of the whole simulation.  
**Note**: In order to be a proper collision the relative position and relative velocity between two particles must have a negative-valued dot product: they must be in opposite directions, i.e. the must be approaching eachother. Violations to this can be caused by clipping from relatively large time deltas.  

### Position (Clip) Space Topology
https://en.wikipedia.org/wiki/Surface_(topology)  
There are several easy topologies of the position space on can encode  
- **Bounded (Box)**
   - bounds bounce particle back with a perfectly elastic collision (walls have infinite mass)
   - Implemented by setting the particle velocity to point inside the bound if out of bounds
   - ```if (position.x > 1.) velocity.x = -abs(velocity.x);```
- **Torus** 
   - bounds wrap around to the opposite side
   - Implemented using the modulo operation while position updating
   - ```updatedPosition = mod(updatedPosition, 1.0);```
- **Sphere** 
   - bounds wrap around to the opposide side of the line diagonally through the viewport

## GPGPU with WebGL 
https://en.wikipedia.org/wiki/General-purpose_computing_on_graphics_processing_units  
Given that WebGL is designed for 3d graphics rendering, one must jump through a few hoops to perform general purpose computations GPU computation with WebGL.  
### Approach
- The approach used is to use an intermediate "compute" program to write to a texture.
- To cover the output texture, the vertex shader should simply render a quad across the screen.
- Therefore the vertex shader essentially acts as a passthrough to the fragment shader.
- The fragment shader performs the computation.
- A fun way to think about the use of textures for encoding vectors of state is how the dynamics in clip space map to colorspace.

### Parallelism vs. Output Size
For a given WebGL program using he above approach the parallelism can be described as follows  
Parameters:
- **h**: The height of the output texture in the framebuffer.
- **w**: Thewidth of the output texture in the framebuffer.
- **c**: The number of color channels of the output texture
- **u**: The number of uniforms used (vectors, matrices and textures count for as many elements as they possess)
- **v**: The number of varyings used (vectors and matrices count for as many elements as they possess)

The number of inputs is given by: ![vhw+u](https://render.githubusercontent.com/render/math?math=vhw%2Bu)  
The number of outputs is given by:  ![hwc](https://render.githubusercontent.com/render/math?math=hwc)  
The number of parallel threads is given by: ![hw](https://render.githubusercontent.com/render/math?math=hw)  

### Floating-Point Textures
https://developer.mozilla.org/en-US/docs/Web/API/OES_texture_float  
In order to get the precision required for particle dynamics simulations floating point numbers are needed over unsigned integers.  
Rather than have the colorspace in [0,127] integers, it is preferable to have it in [0,1] rationals.  
The [0,1] colorspace is then converted to [-1,1] clipspace for computations.  
Thankfully WebGL has a standard floating point number extension that allows for this.  

### Aggregations
Sometime one may want to sum up parallel computed values (aggregate them) from the GPU.  
In the example of this particle simulator, summations of velocity changes (impulses) from forces and collisions between all particle are needed to compute the update to the velocity.  
one can get the GPU to perform this action by using WebGL's alpha blending functionality.  
In particular, encoding all inter-particle interations as a stack of quads to be rendered to the velocity state texture.  
During this shader computation the alpha blend function is as follows: ```gl.blendFunc(gl.ONE, gl.ONE);```

## WebGL Resources
### Complete Guides
https://webglfundamentals.org  
http://learnwebgl.brown37.net  
https://xem.github.io/articles/webgl-guide.html  
### Introductory Examples
https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Basic_2D_animation_example  
https://www.tutorialspoint.com/webgl/webgl_drawing_points.htm  
### Physics Examples
https://gpfault.net/posts/webgl2-particles.txt.html  
https://github.com/PavelDoGreat/WebGL-Fluid-Simulation/blob/master/script.js  
https://stackoverflow.com/questions/56780278/how-to-keep-coordination-between-particles-and-which-texture-pixel-contains-each  
https://stackoverflow.com/questions/15090657/texture-driven-particles-in-webgl-opengl-using-a-shader  

## Todo
- Improve numerical stability
- Add variable particle masses
- Add the classical gravity and Coulomb force
- Add UI
