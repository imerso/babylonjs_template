// Example of a class which
// actually acts like a custom material
// with vertex and fragment shaders.
//
// The shaders source-codes will come
// from two files inside the assets folder.

uniform vec3 bbox;
uniform float time;
uniform mat4 projection;
uniform mat4 view;

in vec3 f_eyePos;
in vec3 eyeDir;
in vec3 f_lightDir;

// basic material structure
struct Material
{
    vec3 color;         // texel color
    vec3 emiss;         // emission color

    float metallicness; // how much metallic the texel is
    float roughness;    // how much diffuse the texel reflection is
    float specular;     // amount of specular reflection
    float fadeDistance; // distance to fade into background cubemap

    // the following are not directly
    // related to material, but stuffed here
    // to avoid returning a lot of structures.

    vec3 normal;        // texel normal
    float depth;        // texel depth
    vec3 ray;           // eye ray direction
};

Material material;

float fCapsule(vec3 p, float r, float c)
{
    return mix(length(p.xz) - r, length(vec3(p.x, abs(p.y) - c, p.z)) - r, step(c, abs(p.y)));
}

float sdBox(vec3 p, vec3 b)
{
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sdSphere(vec3 p, float r)
{
    return length(p) - r;
}

// this one is more like iq's version.
float map(in vec3 p)
{
    //#define _DEBUG
    #ifndef _DEBUG

    #define ITERATIONS 4
    float d = sdBox(p, bbox*0.45);

    float s = 1.0;
    for (int m=0; m<ITERATIONS; m++)
    {
        vec3 a = mod(p*s, 2.0) - 1.0;
        s *= 3.0;
        vec3 r = abs(1.0 - 3.0*abs(a));
        float da = max(r.x,r.y);
        float db = max(r.y,r.z);
        float dc = max(r.z,r.x);
        float c = (min(da,min(db,dc))-1.0)/s;

        if (c>d)
        {
            d = c;
        }
    }

    //float capsule = fCapsule(p, bbox.x, bbox.y/1.5);
    //d = max(capsule, d);

    #else

    float d = sdSphere(p, bbox.x*0.4);

    #endif

    return d;
}


vec3 calcNormal(in vec3 pos)
{
    vec3 eps = vec3(.001,0.0,0.0);
    vec3 nor;

    nor.x = map(pos+eps.xyy) - map(pos-eps.xyy);
    nor.y = map(pos+eps.yxy) - map(pos-eps.yxy);
    nor.z = map(pos+eps.yyx) - map(pos-eps.yyx);

    return normalize(nor);
}

// trace
float raymarch(in vec3 pos, in vec3 ray, float maxd, out vec3 color, out vec3 normal)
{
    vec3 rayPos;
    float t=0.;
    float dst;
    float precis = .001;

    for (int i=0; i<128; i++)
    {
        rayPos = pos + ray * t;
        dst = map(rayPos);
        t += dst;
        if (abs(dst) < precis || t > maxd) break;
        precis += t * .0002;
    }

    if (t > maxd)
    {
        // miss
        return 0.;
    }

    // hit something
    color = vec3(.6,.3,.1); // * max(0.1, 1. - dst*48.);
    normal = calcNormal(rayPos);
    material.metallicness = .25;
    material.roughness = .5;
    material.specular = 1.;
    material.fadeDistance = 15.;

    return t;
}

// main loop which calls custom raymarch()
void main()
{
    material.ray = normalize(eyeDir);
    material.depth = raymarch(f_eyePos, material.ray, 128., material.color, material.normal);

    // the material system wants for each pixel:
    // vec3 color	: pixel color
    // vec3 normal	: pixel normal
    // float depth	: pixel z depth
    // vec3 ray	: ray direction

    #define SUN_INTENSITY 1.1
    //#define IGNORE_ALL_SHADING

    if (material.depth > 0.)
    {
        #ifndef IGNORE_ALL_SHADING

            vec3 matColor = material.color;
            vec3 refRay = reflect(-material.ray, material.normal);
            float sunDot = dot(material.normal, f_lightDir);
            float eyeSunDot = max(0., dot(material.ray, f_lightDir));
            float sunBackDot = -sunDot;

            // sun lighting
            float sunLight = max(sunDot * SUN_INTENSITY, .3);
            material.color *= vec3(material.emiss.x + sunLight, material.emiss.y + sunLight, material.emiss.z + sunLight);

            // "gi"
            float gi = max(.1 + .3 * sunBackDot, 0.);
            material.color += gi * material.color;

        #endif

        vec3 p = f_eyePos + normalize(eyeDir) * material.depth;
        vec4 pclip = projection * view * vec4(p, 1.);
        float ndc_depth = pclip.z / pclip.w;
        gl_FragDepth = ((gl_DepthRange.diff * ndc_depth) + gl_DepthRange.near + gl_DepthRange.far) / 2.;

        gl_FragColor = vec4(material.color, 1.);
    }
    else discard;
}
