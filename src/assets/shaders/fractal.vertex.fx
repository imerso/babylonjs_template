// Example of a class which
// actually acts like a custom material
// with vertex and fragment shaders.
//
// The shaders source-codes will come
// from two files inside the assets folder.

in vec3 position;

uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform vec3 bbox;
uniform vec3 lightDir;
uniform vec3 eyePos;

out vec3 eyeDir;
out vec3 f_eyePos;
out vec3 f_lightDir;

void main()
{
    vec4 pos = view * (world * vec4(position, 1.));

    f_eyePos = -view[3].xyz * mat3(view*world);
    eyeDir = position.xyz - f_eyePos;

    mat3 rot = mat3(world);
    mat3 inv = inverse(rot);
    f_lightDir = -(inv * lightDir);

    gl_Position = projection * pos;
}
