#version 460

#include "common/utils.glsl"
#include "common/features.glsl"
#include "common/ViewConstants.glsl"
#include "common/LightingConstants.glsl"

#define renderMode_Cubemaps 1

in vec3 vFragPosition;
in vec2 vTexCoordOut;
in vec3 vNormalOut;
in vec3 vTangentOut;
in vec3 vBitangentOut;
in vec4 vColorBlendValues;
//#define F_RENDER_BACKFACES 0;


#include "common/lighting_common.glsl"
#include "common/fullbright.glsl"
#include "common/texturing.glsl"
#include "common/pbr.glsl"
#include "common/fog.glsl"

#include "common/environment.glsl" // (S_SPECULAR == 1 || renderMode_Cubemaps == 1)

// Must be last
#include "common/lighting.glsl"



out vec4 outputColor;

#define F_REFLECTION_TYPE 0 // (0="Sky Color Only", 1="Environment Cube Map", 2="SSR over Environment Cube Map")
#define F_REFRACTION 0
#define F_CAUSTICS 0


//H7per: No clue if settings this to bool breaks it, might need testing
uniform bool g_bDontFlipBackfaceNormals;
uniform bool g_bRenderBackfaceNormals;


uniform float g_flWaterPlaneOffset;
uniform float g_flSkyBoxScale;
uniform float g_flSkyBoxFadeRange;
//H7per: should this be vec4??? It was vec3, but fog and decay colors broke that way....decompiles fault :p
uniform vec4 g_vSimpleSkyReflectionColor;
uniform vec2 g_vMapUVMin;
uniform vec2 g_vMapUVMax;
uniform float g_flLowEndCubeMapIntensity;
uniform float g_flWaterRoughnessMin;
uniform float g_flWaterRoughnessMax;
uniform float g_flFoamMin;
uniform float g_flFoamMax;
uniform float g_flDebrisMin;
uniform float g_flDebrisMax;
uniform vec4 g_vDebrisTint;
uniform float g_flDebrisReflectance;
uniform float g_flDebrisOilyness;
uniform float g_flDebrisNormalStrength = 1.0f;
uniform float g_flDebrisEdgeSharpness = 1.0f;
uniform float g_flDebrisScale;
uniform float g_flDebrisWobble;
uniform float g_flFoamScale;
uniform float g_flFoamWobble;
uniform vec4 g_vFoamColor;
uniform float g_flWavesHeightOffset;
uniform float g_flWavesSharpness;
uniform float g_flFresnelExponent;
uniform float g_flWavesNormalStrength;
uniform float g_flWavesNormalJitter;
uniform vec4 g_vWaveScale;
uniform float g_flWaterInitialDirection;
uniform float g_flWavesSpeed;
uniform float g_flLowFreqWeight;
uniform float g_flMedFreqWeight;
uniform float g_flHighFreqWeight;
uniform float g_flWavesPhaseOffset;
uniform float g_flEdgeHardness;
uniform float g_flEdgeShapeEffect;
uniform int g_nWaveIterations;
uniform vec4 g_vWaterFogColor;
uniform float g_flRefractionLimit = 0.1f;
uniform float g_flWaterFogStrength;
uniform vec4 g_vWaterDecayColor;
uniform float g_flWaterDecayStrength;
uniform float g_flWaterMaxDepth;
uniform float g_flWaterFogShadowStrength;
uniform float g_flUnderwaterDarkening;
uniform float g_flSpecularPower;
uniform float g_flSpecularNormalMultiple;
uniform float g_flSpecularBloomBoostStrength;
uniform float g_flSpecularBloomBoostThreshold;
uniform int g_bUseTriplanarCaustics;
uniform float g_flCausticUVScaleMultiple;
uniform float g_flCausticDistortion;
uniform float g_flCausticsStrength;
uniform float g_flCausticSharpness;
uniform float g_flCausticDepthFallOffDistance;
uniform float g_flCausticShadowCutOff;
uniform vec4 g_vCausticsTint;
uniform vec4 g_vViewportExtentsTs;
uniform float g_flReflectance;
uniform float g_flReflectionDistanceEffect;
uniform float g_flForceMixResolutionScale = 1.0;
uniform float g_flEnvironmentMapBrightness;
uniform vec2 g_vRoughness;
uniform float g_flSSRStepSize;
uniform float g_flSSRSampleJitter;
uniform int g_nSSRMaxForwardSteps;
uniform float g_flSSRBoostThreshold;
uniform float g_flSSRBoost;
uniform float g_flSSRBrightness;
uniform float g_flSSRMaxThickness;
uniform float g_flWaterEffectsRippleStrength;
uniform float g_flWaterEffectSiltStrength;
uniform float g_flWaterEffectFoamStrength;
uniform float g_flWaterEffectDisturbanceStrength;
uniform float g_flWaterEffectCausticStrength;

uniform sampler2D g_tZerothMoment;
uniform sampler2D g_tBlueNoise;
uniform sampler2D g_tFoam;
//uniform sampler AllowGlobalMipBiasOverride_0_Filter_255_MaxAniso_1_AddressU_dynamic_AddressV_dynamic;
uniform sampler2D g_tDebris;
//uniform sampler DefaultSamplerState_0;
uniform sampler2D g_tDebrisNormal;

uniform sampler2D g_tWaterEffectsMap;
//uniform sampler Filter_20_AddressU_3_AddressV_3_AddressW_3_BorderColor_0;
//uniform samplerShadow AddressU_2_AddressV_2_Filter_149_ComparisonFunc_3;
//uniform sampler2D g_tShadowDepthBufferDepth;
uniform sampler2D g_tParticleShadowBuffer;
//uniform sampler Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2;
uniform sampler3D g_tLightCookieTexture;
//uniform sampler Filter_21_AddressU_0_AddressV_0_AllowGlobalMipBiasOverride_0;
//uniform samplerCube g_tFogCubeTexture;
uniform sampler2D g_tMoitFinal;
uniform sampler2D g_tWavesNormalHeight;
//uniform sampler DefaultSamplerState_0_1;


#if (F_REFLECTION_TYPE == 0)
    uniform vec4 g_vSimpleSkyReflectionColor = vec4(1.0);
#endif

uniform sampler2D g_tSceneColor;
uniform sampler2D g_tSceneDepth;

#if (F_REFRACTION == 1)
    //uniform sampler2D g_tSceneColor;
    //uniform sampler2D g_tSceneDepth;
#endif

vec3 refraction_func(float IOR);
float water_height(vec2 coords);
float fModulo(float value, float divisor);
double dModulo(double value, double divisor);
vec2 resolution;
vec2 uv;
vec3 normal = vec3(0, 0, 1);
vec2 distortion_direction;

float fov = 75;


vec3 sunColor = GetLightColor(0);
vec3 sunDir = GetEnvLightDirection(0);


void main()
{

    //outputColor = vec4(1.0, 0.2, 0.5, 1.0);

    vec4 fragCoord = gl_FragCoord;
    vec4 fragCoordWInverse = fragCoord;
    fragCoordWInverse.w = 1.0 / fragCoord.w;



    // --- Normal Preparation ---
    bool flipBackfaceNormals = false;
    if(g_bRenderBackfaceNormals)
    {
        flipBackfaceNormals = !g_bDontFlipBackfaceNormals;
    }
    vec3 geometricNormal = vNormalOut * (gl_FrontFacing && !flipBackfaceNormals ? 1.0 : -1.0);

    vec3 worldPos = vFragPosition;

    
    





    // --- Early Discard (OIT Occlusion) ---

    ivec2 momentTexelCoords = ivec2(fragCoord.xy * g_flForceMixResolutionScale);
    float visibilityFromMoment = exp(-texelFetch(g_tZerothMoment, momentTexelCoords, 0).x);
    float occlusionFactor = 1.0 - visibilityFromMoment;
    if (occlusionFactor > 0.9998999834060669) { discard; }

 


    // --- Skybox Scale Effect & Blue Noise ---

    //bvec4 otherEnabledVec = notEqual(g_bOtherEnabled3, ivec4(0));
    //bool isSkybox = otherEnabledVec.x;
    bool isSkybox = false;

    float SkyboxScale;
    if (isSkybox)
    {
        SkyboxScale = g_flSkyBoxScale;
    }
    else
    {
        SkyboxScale = 1.0;
    }
    //TODO: Whats up with this??
    //vec4 NoiseValue = texelFetch(g_tBlueNoise, ivec3(ivec2(FragCoord.xy) & PerViewConstantBufferCsgo_t.g_vBlueNoiseMask, 0).xy, 0);

    vec4 blueNoise = texelFetch(g_tBlueNoise, ivec2(mod(fragCoord.xy, textureSize(g_tBlueNoise, 0))), 0);
    //This came from later on, but was centralized up here.
    vec2 blueNoiseOffset = blueNoise.xy - 0.5;
    // around line 406 in decomp
    float blueNoiseDitherFactor = blueNoiseOffset.x * 2.0;

    


    // --- Position & View Vectors ---

    //FragCoord.xy * PerViewConstantBuffer_t.g_vInvGBufferSize.xy in decompile
    vec2 gbufferUV = fragCoord.xy / textureSize( g_tSceneColor, 0);
    //This one comes at line 361 in the decomp, moved it up here because it makes more sense imo
    vec2 unbiasedUV = (worldPos.xy - g_vMapUVMin) / (g_vMapUVMax - g_vMapUVMin);
    unbiasedUV.y = 1.0 - unbiasedUV.y;

    vec3 relFragPos = worldPos - g_vCameraPositionWs;

    

    vec3 viewDir = normalize(relFragPos);
    vec3 invViewDir = -viewDir;
    float distanceToFrag = length(relFragPos) * SkyboxScale;

    float fragDepth = gl_FragCoord.z;
    //^ my own addition, from distance and depth, you can get a multiplier for any depth sample taken at gbufferUV from depth to true distance

    vec2 viewParallaxFactor = (viewDir.xy) / (-viewDir.z + 0.25) * 1;
    //The following is not in the direct decompile either, but the inverse offset like this exists atleast once
    vec3 worldPosToCamera = g_vCameraPositionWs - worldPos;


    

    // ---- Skybox corrected projection stuff ---------

    //Gemini suggested this one below but its not even used here yet. Again TODO to check that
    //vec3 scaledRelFragPos = relFragPos * SkyboxScale;
    //vec3 horChangerateSqrtZ = mix( vec3(invViewDir.xy / invViewDir.z, sqrt(invViewDir.z)), vec3(0.0), isSkybox);
    vec3 viewDepOffsetFactor = mix(vec3(viewDir.xy / viewDir.z, sqrt(-viewDir.z)), vec3(0.0), vec3(isSkybox));



    // ---- Something about Refraction (idk either) ------

    float refractionDistortionFactor = 0.0;
    float waterColumnOpticalDepthFactor = 1.0;
    vec4 refractionColorSample = vec4(0.0);
    float sceneNormalizedDepth = 1.0;
    vec3 sceneHitPositionWs = vec3(0.0);
    

    //What the fuck is this for? TODO, also not in the raw decompile
    float sceneViewDistance = -0.95;

    // ----- SOME PRE REFRACTION ???? ------
    //I have no fucking clue why they do this beforehand
    if (!isSkybox) {
        float g_flViewportMinZ = 0.05;
        float g_flViewportMaxZ = 1.0;

        float sceneDepth = textureLod(g_tSceneDepth, gbufferUV, 0.0).x;
        sceneNormalizedDepth = clamp((sceneDepth - g_flViewportMinZ) / (g_flViewportMaxZ - g_flViewportMinZ), 0.0, 1.0);

        refractionColorSample = texture(g_tSceneColor, gbufferUV);

        float refractionLuminance = clamp(dot(refractionColorSample.rgb, vec3(0.2125, 0.7154, 0.0721)), 0.0, 0.4);

        refractionDistortionFactor = refractionLuminance * -0.03;

        //TODO: Check if this is actually correct. I am assuming InvProjRow3 refers to the Row 3 of the inverse projection mat. But .w is always 0 in inv proj for reverse Z so no clue what the fuck this math is.
        mat4 invProj = inverse(g_matViewToProjection);
        float invProjTerm = fma(sceneNormalizedDepth, invProj[2][3], invProj[3][3]);

        vec3 cameraDir = -normalize(inverse(mat3(g_matWorldToView))[2]);


        float perspectiveCorrection = dot(cameraDir, viewDir);

        sceneViewDistance = (1.f / (invProjTerm * perspectiveCorrection));

        //float normalizedFragDepth = (fragDepth - 0.05) / 0.95;
        //sceneViewDistance = (1 / sceneNormalizedDepth) * ( distanceToFrag / (1.0 / normalizedFragDepth));

        sceneHitPositionWs = g_vCameraPositionWs + viewDir * sceneViewDistance;

        //sceneHitPositionWs = (g_vCameraPositionWs.xyz + (localPixelDir * (1.0 / (fma(SceneDepth, g_vInvProjRow3.z, g_vInvProjRow3.w) * dot(g_vCameraDirWs.xyz, localPixelDir))))).xyz;
        float waterSurfaceViewZ = -(g_matWorldToView * vec4(worldPos, 1.0)).z;
        waterColumnOpticalDepthFactor = (refractionDistortionFactor * 1.0 + max((1.0 / sceneNormalizedDepth) - waterSurfaceViewZ, 0.0) * 0.01);

        //outputColor.rgb = vec3(worldPos.z - sceneHitPositionWs.z) - 10;// - 0.2;
        //return;

    }

    


    float waterSurfaceViewZ = -(g_matWorldToView * vec4(worldPos, 1.0) ).z;

    vec3 cameraDir = -normalize(inverse(mat3(g_matWorldToView))[2]);
    //outputColor = vec4(waterColumnOpticalDepthFactor);
    //return;

    //outputColor = vec4(cameraDir.x * viewDir.x + cameraDir.y * viewDir.y + cameraDir.z * viewDir.z);
    //return;

    float adjustedWaterColumnDepth = max(0.0, waterColumnOpticalDepthFactor - 0.02);
    float refractedVerticalFactor = waterColumnOpticalDepthFactor * invViewDir.z;

    // --- Get Roughness, Foam and Debris ----

    float currentWaterRoughness;
    if(isSkybox)
    {
        currentWaterRoughness = g_flWaterRoughnessMax;
    }
    else
    {
        currentWaterRoughness = max(0.0, mix(g_flWaterRoughnessMin, g_flWaterRoughnessMax, vColorBlendValues.x));
    }
    float currentFoamAmount = isSkybox ? 0.0 : max(0.0, mix(g_flFoamMin, g_flFoamMax, vColorBlendValues.y));
    float currentDebrisVisibility = (isSkybox ? 0.0 : max(0.0, mix(g_flDebrisMin, g_flDebrisMax, vColorBlendValues.z)));




    vec2 baseWaveUV = (worldPos.xy * SkyboxScale + viewDepOffsetFactor.xy * (0.5 - g_flWaterPlaneOffset)) / 30.f; // Another arbitrary scale

    vec2 baseWaveUVDx = dFdx(baseWaveUV);
    //TODO: same shit as earlier with dFdy: why is it flipped in CS?
    vec2 baseWaveUVDy = -dFdy(baseWaveUV);

    //outputColor = vec4(-baseWaveUVDy, 1.0, 1.0);
    //return;

    float reflectionsLodFactor = (0.5 * pow(max(dot(baseWaveUVDx, baseWaveUVDx), dot(baseWaveUVDy, baseWaveUVDy)), 0.1)) * g_flReflectionDistanceEffect;


    


    //(fragCoord.xy - g_vViewportOffset.xy) * g_vInvViewportSize.xy * g_vViewportToGBufferRatio.xy, just assuming a size of SceneColor and ratio of 1.0
    vec2 waterEffectsMapUV = gbufferUV;
    vec4 waterEffectsSampleRaw = vec4(0.0); //texture(g_tWaterEffectsMap, waterEffectsMapUV);
    vec2 waterEffectsDisturbanceXY = clamp((waterEffectsSampleRaw.yz - 0.5) * 2.0, 0.0, 1.0);
    float waterEffectsFoam = waterEffectsDisturbanceXY.y;

    //TODO MISMATCH: this matches decompile, what the fuck is it?
    vec4 _24505;
    _24505.z = waterEffectsFoam;

    float totalDisturbanceStrength = (waterEffectsDisturbanceXY.x + waterEffectsDisturbanceXY.y) * g_flWaterEffectDisturbanceStrength;
    float disturbanceWeightedFoamAmount = totalDisturbanceStrength * 0.25;
    float clampedLodFactor = clamp(reflectionsLodFactor, 0.0, 0.5);

    //I have no idea what the fuck this does and I don't have the energy to find out rn


    vec3 refractShiftedPos = sceneHitPositionWs + viewDepOffsetFactor * clamp(dot(refractionColorSample.rgb, vec3(0.2125, 0.7154, 0.0721)), 0.0, 0.4);

    vec3 refractShiftedPosDdx = dFdx(refractShiftedPos);

    //TODO: Find out why the fuck this one is flipped vs the game. This just stole me many hours of my life
    vec3 refractShiftedPosDdy = -dFdy(refractShiftedPos);
    vec3 refractShiftNormal = -normalize(cross(refractShiftedPosDdx, refractShiftedPosDdy));

    //outputColor = vec4(refractShiftedPosDdy, 1.0);
    //return;

    float timeAnim = g_flTime * 3.0 + sin(g_flTime * 0.5) * 0.1;


    vec2 depthFactorFine = vec2(clamp(adjustedWaterColumnDepth * 10.0, 0.0, 1.0));
    vec2 depthFactorCoarse = vec2(clamp(adjustedWaterColumnDepth * 4.0, 0.0, 1.0));

    //outputColor = vec4(adjustedWaterColumnDepth) * 1000; return;


    float sceneDepthChangeMagnitude = fwidth(sceneNormalizedDepth);


    vec2 ditheredRefractShiftNormalXY = refractShiftNormal.xy + blueNoiseOffset * 0.05;
    

    // ------ WAVE LOGIC -------
    vec2 accumulatedWaveUVOffset = vec2(0.0); // For UV distortion by waves
    vec2 currentWaveTexScale = g_vWaveScale.xy;
    vec3 accumulatedWaveNormal = vec3(0.0, 0.0, 1.0); // Start with up vector
    float accumulatedWaveHeight = 0.0;
    vec2 accumulatedPhaseOffset = vec2(0.0);
    
    float currentWaveAngle = g_flWaterInitialDirection;

    


    //H7per: This logic is the result of a manual decompile with a Gemini 2.5 Pro decompile as reference. By all logic, this should be correct.
    for (uint i = 0; i < g_nWaveIterations; ++i)
    {
        
        

        float iterProgress = float(i) / (float(g_nWaveIterations) - 1.0);

        // Weight for this wave octave (low, med, high frequencies)

        float lowMedBlend = clamp(iterProgress * 2.0, 0.0, 1.0);
        float medHighBlend = clamp(iterProgress * 2.0 - 1.0, 0.0, 1.0);

        float lowFreqWeight = fma(totalDisturbanceStrength, 0.05, g_flLowFreqWeight);
        float medFreqWeight = fma(totalDisturbanceStrength, 0.25, g_flMedFreqWeight);

        //float _10450 = mix(mix(fma(_18208, 0.05, g_flLowFreqWeight), fma(_18208, 0.25, g_flMedFreqWeight), clamp(_3843 * 2.0, 0.0, 1.0)), fma(g_flHighFreqWeight, _24840, _7242), clamp(fma(_3843, 2.0, -1.0), 0.0, 1.0));

        float lowMedWeightedAmplitude = mix(
        lowFreqWeight,
        medFreqWeight,
        lowMedBlend
        );

        float freqWeight = mix(
            lowMedWeightedAmplitude,
            g_flHighFreqWeight * currentWaterRoughness + disturbanceWeightedFoamAmount, // Roughness makes high-freq waves stronger
            medHighBlend
        );

        // Sample wave texture: RG=Normal, B=Height (all signed, centered at 0.5)
        vec2 waveAnimOffset = vec2(sin(currentWaveAngle), cos(currentWaveAngle)) * (g_flTime * g_flWavesSpeed) * 0.5;
        vec2 anisoUV = waveAnimOffset * inversesqrt(currentWaveTexScale); // Anisotropic speed based on scale
        vec2 waveSampleUV =  anisoUV + (baseWaveUV + accumulatedWaveUVOffset * 3.0 + accumulatedPhaseOffset) / currentWaveTexScale;
        vec3  sampledWaveNormalHeight = texture(g_tWavesNormalHeight, waveSampleUV).xyz - vec3(0.5);
        
        float waveHeightComponent = sampledWaveNormalHeight.z * freqWeight * length(currentWaveTexScale); // Height contribution
        vec2 waveNormalXYComponent = sampledWaveNormalHeight.xy * 2.0; // Unpack normal

        // Anisotropic normal scaling
        waveNormalXYComponent.x *= min(1.0, currentWaveTexScale.y / currentWaveTexScale.x);
        waveNormalXYComponent.y *= min(1.0, currentWaveTexScale.x / currentWaveTexScale.y);
        waveNormalXYComponent *= (freqWeight * 0.1); // Scale normal contribution

        // Accumulate height
        accumulatedWaveHeight += waveHeightComponent * 0.01; // Scale factor

        // Accumulate normal
        accumulatedWaveNormal.xy += waveNormalXYComponent;

        // Accumulate UV offset for next iteration (choppiness / parallax)
        // Parallax factor for wave displacement (view-dependent)

 


        accumulatedWaveUVOffset += (-viewParallaxFactor) * (waveHeightComponent * 0.01) * g_flWavesHeightOffset * currentWaterRoughness;
        currentWaveTexScale *= g_flWavesPhaseOffset; // e.g., smaller scale for higher frequency
        accumulatedPhaseOffset += waveNormalXYComponent * g_flWavesSharpness * currentWaveTexScale;
        // Update parameters for next iteration

        currentWaveAngle += 3.5 / float(i + 1u); // Change angle to avoid repetition
    }


    
    vec2 finalWavePhaseOffset = accumulatedPhaseOffset * 0.1;
    vec3 roughedWaveNormal = accumulatedWaveNormal * currentWaterRoughness;
    float scaledAccumulatedWaveHeight = accumulatedWaveHeight * currentWaterRoughness * 60.0; // For stronger visual effect



    //outputColor.rgb = refractShiftNormal;
    //return;

    vec3 ditheredNormal = vec3(0.0, 0.0, 1.0);



    float edgeFactorQ = g_flEdgeShapeEffect;
    if (!isSkybox)
    {
        ditheredNormal = refractShiftNormal;

        //outputColor = vec4( refractShiftNormal.z);
        //return;
        ditheredNormal.x = ditheredRefractShiftNormalXY.x;
        ditheredNormal.y = ditheredRefractShiftNormalXY.y;
        edgeFactorQ = g_flEdgeShapeEffect * clamp(fma(-refractShiftNormal.z, 1.0 - clamp(refractedVerticalFactor * 8.0, 0.0, 1.0), 1.2), 0.0, 1.0);
    }


    //outputColor.rgb = vec3(edgeFactorQ) / 4;
    //return;


    

    vec3 waveDisplacedWorldPos = worldPos + viewDepOffsetFactor.xyz * (mix(0.5, scaledAccumulatedWaveHeight, g_flEdgeShapeEffect) - g_flWaterPlaneOffset) * 1;

    //TODO: no wave offset? decompile says no but I don't buy it yet


    float finalFoamHeightContrib = scaledAccumulatedWaveHeight;
    float foamSiltFactor = 0.0;
    vec2 foamEffectDisplacementUV = vec2(0.0);
    vec2 debrisEffectsNormalXY = vec2(0.0);
    float foamFromEffects = 0.0;
    float debrisDisturbanceForWaves = g_flWaterEffectDisturbanceStrength * 0.25;
    float finalFoam = waterEffectsFoam;

    vec2 foamSiltEffectNormalXY = vec2(0.0);

    vec3 effectsSamplePos = worldPos.xyz + (viewDepOffsetFactor * (mix(0.5, scaledAccumulatedWaveHeight, edgeFactorQ) - g_flWaterPlaneOffset));

    // ----READ FROM EFFECTS MAP FOR DECAL BASED EFFECTS (shots, people running through water, etc...)
    if(!isSkybox)
    {
        mat4 transposedWorldToProj = transpose(g_matWorldToProjection);

        vec3 effectsPos0 = (worldPos + (viewDepOffsetFactor * (mix(0.0, scaledAccumulatedWaveHeight, edgeFactorQ) - g_flWaterPlaneOffset))) + (vec3(roughedWaveNormal.xy, 0.0) * (-16.0));
 
        vec4 effectsPos0Transformed = (vec4(effectsPos0 - g_vCameraPositionWs, 1.0)) * transposedWorldToProj;
        //TODO: Figure out what that shit before and if this is really ndc, I am using the naming straight from Gemini.
        vec2 effectsPos0NcdCoords = effectsPos0Transformed.xy / effectsPos0Transformed.w;
        //TODO: Do we need a GBuffer ratio? 1.0 is gbuffer ratio in decompile, but I am just setting 1 here.
        vec4 effectsSample0 = vec4(0.0); //texture(g_tWaterEffectsMap,  ((vec2(effectsPos0NcdCoords.x, -effectsPos0NcdCoords.y) * 0.5) + vec2(0.5)).xy * 1.0    ) - vec4(0.5);

         


        vec3 effectsPos1 = effectsPos0 + (viewDepOffsetFactor * fma(20.0, effectsSample0.x, 2.0 * clamp(effectsSample0.yz * 2.0, vec2(0.0), vec2(1.0)).x));
        vec4 effectsPos1Transformed = (vec4(effectsPos1.xyz, 1.0) - vec4(g_vCameraPositionWs, 1.0)).xyzw * transposedWorldToProj;
        vec2 effectsPos1NcdCoords = effectsPos1Transformed.xy / effectsPos1Transformed.w;
        //Same as before, gbuffer ratio??
        vec2 effectsPos1UV = ((vec2(effectsPos1NcdCoords.x, -effectsPos1NcdCoords.y) * 0.5) + vec2(0.5)).xy * 1.0;
        vec4 effectsSample1 = vec4(0.0); //texture(g_tWaterEffectsMap, effectsPos1UV);


        vec2 rippleFoamFromEffectsMap = clamp(effectsSample1.yz*2.0,0.0,1.0);
        //float rippleBaseFromEffectsMap = rippleFoamFromEffectsMap.x;
        //float foamBaseFromEffectsMap = rippleFoamFromEffectsMap.y;


        vec4 _24771;
        _24771.z = rippleFoamFromEffectsMap.y;

        vec4 offsetClipPosX = (vec4(effectsPos1 - g_vCameraPositionWs +vec3(1,0,0) ,1.0))*transposedWorldToProj;
        vec4 offsetClipPosY = (vec4(effectsPos1 - g_vCameraPositionWs + vec3(0,-1,0),1.0))*transposedWorldToProj;

        vec2 offsetNdcX = offsetClipPosX.xy / offsetClipPosX.w;
        vec2 offsetNdcY = offsetClipPosY.xy / offsetClipPosY.w;
        //again gbuffer ratio
        vec2 duv_dx_approx = (( (vec2(offsetNdcX.x,-offsetNdcX.y) * 0.5 ) + 0.5 ) * 1.0 ) - effectsPos1UV;
        vec2 duv_dy_approx = (( (vec2(offsetNdcY.x,-offsetNdcY.y) * 0.5 ) + 0.5 ) * 1.0 ) - effectsPos1UV;
        vec2 stepScale = vec2(0.0004)/ vec2(length(duv_dx_approx),length(duv_dy_approx));

        vec4 xOffsetEffectsSample = vec4(0); //texture(g_tWaterEffectsMap, effectsPos1UV * 1.0 + normalize(duv_dx_approx) * 0.005) - 0.5;
        vec4 yOffsetEffectsSample = vec4(0); //texture(g_tWaterEffectsMap, effectsPos1UV * 1.0 + normalize(duv_dy_approx) * 0.005) - 0.5;

        vec2 rippleFoamDX = clamp(xOffsetEffectsSample.yz * 2.0, vec2(0.0), vec2(1.0));
        vec2 rippleFoamDY = clamp(yOffsetEffectsSample.yz * 2.0, vec2(0.0), vec2(1.0));

       
        foamEffectDisplacementUV = (normalize(cross(vec3(stepScale.x,0,effectsSample1.x - xOffsetEffectsSample.x),vec3(0,stepScale.y, effectsSample1.x - yOffsetEffectsSample.x))).xy*vec2(-1,1))*(abs(effectsSample1.x)*4.0) * g_flWaterEffectsRippleStrength;
        finalFoamHeightContrib += effectsSample1.x * g_flWaterEffectsRippleStrength * 12;
        foamSiltFactor = rippleFoamFromEffectsMap.y * g_flWaterEffectSiltStrength;

        debrisEffectsNormalXY = normalize(cross(vec3(stepScale.x,0,rippleFoamFromEffectsMap.x - rippleFoamDX.x),vec3(0.0, stepScale.y, rippleFoamFromEffectsMap.x - rippleFoamDY.x))).xy * vec2(-1.0, 1.0);

        foamFromEffects = rippleFoamFromEffectsMap.x * g_flWaterEffectFoamStrength;

        
        //the decompile is so ridiculous here that I can't even put it into words
        //TODO: crosscheck with decompile again on _24771
        finalFoam = effectsSample1.y;
        debrisDisturbanceForWaves = ((effectsSample1.x + effectsSample1.y ) * g_flWaterEffectDisturbanceStrength) * 0.25;


        foamSiltEffectNormalXY = (normalize(cross(vec3(stepScale.x,0, effectsSample1.y -rippleFoamDX.y),vec3(0,stepScale.y, effectsSample1.y - rippleFoamDY.y))).xy*vec2(-1,1)) * pow(effectsSample1.y,3.5); // Original used rippleFoam_plusDY.y

        effectsSamplePos += (vec3(foamEffectDisplacementUV.xy, 0.0) * (-4.0));
    }
    vec3 rippleDisplacementAsVec3 = vec3(foamEffectDisplacementUV, 0.0);

    vec3 worldPosForFoamAndDebrisBase = (worldPos + (viewDepOffsetFactor * (mix(0.5, finalFoamHeightContrib, edgeFactorQ * 0.5) - g_flWaterPlaneOffset))) + (rippleDisplacementAsVec3 * (-2.0));

    vec2 foamWobbleAnim = vec2(sin(effectsSamplePos.y * 0.07 + timeAnim), cos(effectsSamplePos.x * 0.07 + timeAnim));
    vec2 foamBaseUV = (worldPosForFoamAndDebrisBase.xy / g_flFoamScale);
    vec2 foamWobbleEffect =  (foamBaseUV + finalWavePhaseOffset * g_flFoamWobble * 0.5) * (1.0 - currentFoamAmount) - (foamSiltEffectNormalXY / g_flFoamScale);    


    //TODO TEMPORARY: This is just for very basic visualisation at this point and will go away soon.
//    if( length(waveDisplacedWorldPos - g_vCameraPositionWs) > length(sceneHitPositionWs - g_vCameraPositionWs))
//    {
//        discard;
//    }

    float foamNoiseStrength = finalFoam + 0.05;
    vec4 foamSample1 = texture(g_tFoam, mix(foamBaseUV, foamWobbleEffect + (foamWobbleAnim * foamNoiseStrength * 0.03), depthFactorFine) );
    vec2 sample2Mix1 = foamBaseUV.yx * 0.731;
    vec2 sample2Mix2 = (foamWobbleEffect.xy * 0.731) + ((vec2(sin(fma(effectsSamplePos.y, 0.06, timeAnim)), cos(fma(effectsSamplePos.x, 0.06, timeAnim))) * foamNoiseStrength) * 0.02);
    vec4 foamSample2 = texture(g_tFoam, mix(sample2Mix1, sample2Mix2, depthFactorFine)); // Second sample with different UVs/anim for variation
    float combinedFoamTextureValue = ( sin(blueNoise.x) * 0.125 + max(foamSample1.z, foamSample2.z) );
    float finalFoamIntensity = fma(    currentFoamAmount * fma(finalFoamHeightContrib, 0.008, 1.0),       1.0 - clamp(debrisDisturbanceForWaves * 2.0, 0.0, 1.0),       foamFromEffects   );
    finalFoamIntensity = clamp(finalFoamIntensity, 0.0, 1.0);
    float finalFoamPow1_5 = pow(finalFoam, 1.5);



    vec2 debrisBaseUV = worldPosForFoamAndDebrisBase.xy / g_flDebrisScale;
    vec2 debrisWobbleOffset = finalWavePhaseOffset * g_flDebrisWobble;
    //outputColor.rgb = vec3(debrisWobbleOffset, 0.0) * 100;
    //return;

    float absFoamSiltX = abs(foamSiltEffectNormalXY.x);
    float absFoamSiltY = abs(foamSiltEffectNormalXY.y);
    float _15937 = foamSiltEffectNormalXY.y * float(absFoamSiltY > absFoamSiltX);
    vec2 dominantFoamSiltNorm = (vec2(foamSiltEffectNormalXY.x * float(absFoamSiltX > abs(_15937)), _15937) / g_flDebrisScale) * 400.0;

    vec2 debrisDistortedUV = ((debrisBaseUV + (debrisWobbleOffset * (1.0 - currentDebrisVisibility))));
    debrisDistortedUV += ((viewParallaxFactor * (fma(sin(finalFoam * 50.0) * 4.0, clamp(0.1 - finalFoamPow1_5, 0.0, 1.0), 1.0) * finalFoamPow1_5)) * 0.1);
    debrisDistortedUV +=  ((foamWobbleAnim * (0.1 + finalFoam)) * 0.02);
    debrisDistortedUV -=  dominantFoamSiltNorm;
    //could be replaced by debrisBaseUV + Distortion * depthFactorCoarse
    vec2 debrisFinalUV = mix(debrisBaseUV, debrisDistortedUV, depthFactorCoarse).xy;

    vec4 debrisColorHeightSample = texture(g_tDebris, debrisFinalUV, finalFoamPow1_5 * 3.0); // RGB=color, A=height/mask
    float debrisHeightVal = debrisColorHeightSample.a - 0.5; // Signed height


    

    
    float finalDebrisVisibility = fma(-currentDebrisVisibility, clamp(1.4 - (finalFoam / mix(1.0, 0.4, debrisColorHeightSample.w)), 0.0, 1.0), 1.0);
    float debrisEdgeFactor = clamp((debrisColorHeightSample.a - finalDebrisVisibility) * g_flDebrisEdgeSharpness, 0.0, 1.0);

    float noClue = max(0.0, fma(2.0, finalFoamPow1_5, debrisHeightVal * (-2.0)));
    float debrisVisibilityMask = clamp(fma(-noClue, 10.0, 1.0), 0.0, 1.0);
    //TODO: This is so far off from what it actually is that I don't know what to think tbh
    float finalDebrisFactor = debrisVisibilityMask * debrisEdgeFactor; // Final alpha for debris layer

    vec3 debrisNormalSample = texture(g_tDebrisNormal, debrisFinalUV).xyz - vec3(0.5); // Sample and un-pack

    


    debrisNormalSample.y *= -1.0; // Flip G channel (common convention)
    vec2 debrisNormalXY = debrisNormalSample.xy * g_flDebrisNormalStrength;

    //outputColor.rg = vec2(g_flDebrisNormalStrength);
    //return;

    

    float combinedfinalFoamIntensity = clamp(fma(-debrisVisibilityMask, debrisEdgeFactor, fma(finalFoamIntensity * combinedFoamTextureValue, 0.25, clamp(finalFoamIntensity - (1.0 - combinedFoamTextureValue), 0.0, 1.0) * 0.75)), 0.0, 1.0);
    float finalDebrisFoamHeightContrib = mix(finalFoamHeightContrib, fma(finalFoamHeightContrib, 0.5, debrisHeightVal * 2.0), finalDebrisFactor);



    

    vec3 finalSurfacePos = effectsSamplePos;
    float finalWaterColumnDepthForRefract = waterColumnOpticalDepthFactor;

    

    if(!isSkybox)
    {
        finalSurfacePos = worldPos.xyz + (viewDepOffsetFactor * (mix(0.5, scaledAccumulatedWaveHeight, edgeFactorQ) - g_flWaterPlaneOffset)) + (rippleDisplacementAsVec3) * (-12.0);

        //TODO: had to remove the first negative from this one too because else fmaM1 is always negative, what the fuck. Gonna have to Nsight the game
        float fmaM1 = max(   (   1.0 / fma(1.0, sceneNormalizedDepth, 0.0)   )     -  -(g_matWorldToView * vec4(finalSurfacePos.xyz, 1.0).xyzw).z, 0.0);

        finalWaterColumnDepthForRefract = fma(fmaM1, 0.01, refractionDistortionFactor);
    }

    //outputColor = vec4(waterColumnOpticalDepthFactor) * 1;
    //return;

    float surfaceCoverageAlpha = clamp(debrisEdgeFactor + combinedfinalFoamIntensity, 0.0, 1.0);

    vec2 finalWaveNormalXY = (((roughedWaveNormal.xy * 2.0) * g_flWavesNormalStrength) * mix(1.0, 2.0, reflectionsLodFactor)) * 1.0; // * mix(1.0, 2.0, reflectionMipBiasFactor); // Stronger at glancing angles

    finalWaveNormalXY *= fma(clamp(0.2 - finalWaterColumnDepthForRefract, 0.0, 1.0), 8.0, 1.0);

    finalWaveNormalXY += ((debrisNormalXY * finalDebrisFactor) * 1.5);

    finalWaveNormalXY += (mix(foamSample1.xy - vec2(0.5), foamSample2.xy - vec2(0.5), vec2(float(foamSample2.z > foamSample1.z))).xy * combinedfinalFoamIntensity);

    finalWaveNormalXY += ((debrisEffectsNormalXY.xy * combinedfinalFoamIntensity) * 0.5);

    finalWaveNormalXY += ((foamEffectDisplacementUV.xy * (1.0 - clamp(fma(debrisVisibilityMask, debrisEdgeFactor, combinedfinalFoamIntensity), 0.0, 1.0))) * 2.0);

    finalWaveNormalXY *= (vec2(1.0) + ((blueNoiseOffset * 2.0) * g_flWavesNormalJitter));

    //TODO: Gemini normalizes here, idfk man
    vec3 surfaceNormal = vec3(finalWaveNormalXY, sqrt(1.0 - clamp(dot(finalWaveNormalXY, finalWaveNormalXY), 0.0, 1.0)));

    vec2 perturbedNormalXY = surfaceNormal.xy * 3.0; // Stronger perturbation
    vec3 perturbedSurfaceNormal = vec3(perturbedNormalXY, sqrt(1.0 - clamp(dot(perturbedNormalXY, perturbedNormalXY), 0.0, 1.0)));


    //outputColor.rgb = perturbedSurfaceNormal;
    //return;


    vec3 finalSurfaceNormal = surfaceNormal;
    vec3 finalPerturbedSurfaceNormal = perturbedSurfaceNormal;
    if (!isSkybox)
    {
        float _20589 = mix(60.0, 120.0, ditheredNormal.z);
        vec3 edgeLimitFactor = vec3((clamp(fma(-sceneDepthChangeMagnitude, 1000.0, clamp(((1.0 / _20589) - finalWaterColumnDepthForRefract) * _20589, 0.0, 1.0) + clamp((0.025 - finalWaterColumnDepthForRefract) * 8.0, 0.0, 1.0)), 0.0, 1.0) / fma(distanceToFrag, 0.002, 1.0)) * 0.6);

        //outputColor.rgb = vec3(finalWaterColumnDepthForRefract);
        //return;

        finalSurfaceNormal = normalize(mix(surfaceNormal, ditheredNormal, edgeLimitFactor));
        finalPerturbedSurfaceNormal = normalize(mix(perturbedSurfaceNormal, ditheredNormal, edgeLimitFactor));

        //if(length(edgeLimitFactor) > 0.5)
        //    discard;
    }

    
    


    float cosNormAngle = clamp(dot(-viewDir, finalPerturbedSurfaceNormal.xyz), 0.0, 1.0);
    float fresnel = pow(1.0 - cosNormAngle, g_flFresnelExponent);

    vec3 finalFoamColor = g_vFoamColor.rgb * fma(combinedfinalFoamIntensity, 0.5, 1.0);
    
    float g_flViewportMinZ = 0.05;
    float g_flViewportMaxZ = 1.0;



    if(!isSkybox)
    {
        vec2 refractionUVOffsetRaw = (vec2(dot(finalPerturbedSurfaceNormal.xy, cross(-viewDir, vec3(0.0, 0.0, -1.0)).xy), dot(finalPerturbedSurfaceNormal.xy, -viewDir.xy)) + ((blueNoiseOffset * 0.002) * g_flWaterFogStrength)).xy * min(g_flRefractionLimit, finalWaterColumnDepthForRefract);
        float depthBufferRange = g_flViewportMaxZ - g_flViewportMinZ;
        float surfaceDepth = -(g_matWorldToView * vec4(finalSurfacePos, 1.0)).z;


        float normalizedDepth = clamp((textureLod(g_tSceneDepth, gbufferUV + refractionUVOffsetRaw.xy, 0.0).x - g_flViewportMinZ) / depthBufferRange, 0.0, 1.0);
        float groundDepth = (1.0 / fma(1.0, normalizedDepth, 0.0 /*PsToVs*/));

        float waterExtent = groundDepth - surfaceDepth;
        //good ol DepthPsToVs
        float refractionOffsetAttenuation = clamp(fma(max(waterExtent, 0.0), 0.01, refractionDistortionFactor) * 10.0, 0.0, 1.0);
        vec2 finalRefractionUVOffset = refractionUVOffsetRaw * refractionOffsetAttenuation;

        float finalRefractedNormalizedDepth = (texture(g_tSceneDepth, finalRefractionUVOffset).x - g_flViewportMinZ) / depthBufferRange;
        vec4 finalRefractedColor = texture(g_tSceneColor, clamp(gbufferUV + finalRefractionUVOffset, vec2(0.0), vec2(1.0)));

        

        vec3 darkenedRefractedColor = pow(finalRefractedColor.rgb, vec3(1.1)) * g_flUnderwaterDarkening;
        float foamSiltStrength = fma(foamSiltFactor, 2.0, g_flWaterFogStrength);

        float causticVisibility = clamp((dot(darkenedRefractedColor.xyz, vec3(0.2125, 0.7154, 0.0721)) - g_flCausticShadowCutOff) * (2.0 + g_flCausticShadowCutOff), 0.0, 1.0);

        //VALIDATE: foamSiltStrength and causticVisibility. Make sure they match original!

        //outputColor.rgb = vec3(debrisNormalSample.xy, 0.0);
        //outputColor = vec4(1);
        //return;
        //outputColor.rgb = vec3(causticVisibility);
        //return;

        //outputColor.rgb = vec3(finalPerturbedSurfaceNormal.xy, 0.0) * 100;
        //return;

        

        /*vec3 rawSample = texture(g_tWavesNormalHeight, worldPos.xy / 10, 100).xyz;

        outputColor.rgb = vec3(rawSample.xy - 0.5, 0);
        return;*/


        outputColor.rgb = vec3(0);
        //vec3 rawSample = texture(g_tWavesNormalHeight, worldPos.xy / 10, 100).xyz;
        if(causticVisibility > 0.0)
        {
            //outputColor.rgb = vec3(rawSample.xy - 0.5, 0);
            return;
            
        }
        vec3 rawSample = texture(g_tWavesNormalHeight, worldPos.xy / 10, 100).xyz;

        outputColor.rgb = vec3(rawSample.xy - 0.5, 0) * 10;
        return;

    }

























    float depthBelowSurface = 0.0;
    if (!isSkybox)
    {
        float surface_view_z = (vec4(finalSurfacePos, 1.0) * g_matWorldToView).z;
        //float scene_depth_view_z = g_vDepthPsToVsConversion.x / (texture_fetch_depth_here - g_vDepthPsToVsConversion.y); // Conceptual

        float scene_depth_view_z = (1.0 / (texture(g_tSceneDepth, gl_FragCoord.xy / textureSize(g_tSceneDepth, 0)).r - 0.05));

        depthBelowSurface = max(0.0, (scene_depth_view_z - surface_view_z) * 0.01); // Scale to world units
    } else {
        depthBelowSurface = 1.0; // Effectively infinite depth for skybox
    }

    //depthBelowSurface = min(depthBelowSurface, g_flWaterMaxDepth);




    // Attenuate normals near shore/objects (based on depthBelowSurface and screen space pixel footprint)
    float screenPixelFootprint = dFdx(1.0) + dFdy(1.0); // Simplified screen space derivative
    float nearShoreFactor = (clamp(1.0 - screenPixelFootprint * 1000.0, 0.0, 1.0) *
                            (clamp((0.00833 - depthBelowSurface) * 120.0, 0.0, 1.0) + clamp((0.025 - depthBelowSurface) * 8.0, 0.0, 1.0)));
    nearShoreFactor /= (1.0 + distanceToFrag * 0.002); // Attenuate with distance
    nearShoreFactor *= 0.6;

    vec3 finalShadingNormal    = normalize(mix(surfaceNormal, vec3(0,0,1), nearShoreFactor));
    vec3 finalReflectionNormal = normalize(mix(perturbedSurfaceNormal, vec3(0,0,1), nearShoreFactor));

    // --- Fresnel ---
    //float fresnel = pow(1.0 - clamp(dot(viewDir, finalReflectionNormal), 0.0, 1.0), g_flFresnelExponent);

    // --- Water Color (Absorption & Base Color) ---
    vec3 foamColor = g_vFoamColor.rgb * (1.0 + finalFoamIntensity * 0.5);
    float foamFogMix = finalFoamIntensity * 0.1;
    vec3 waterBaseColor = mix(g_vWaterFogColor.rgb, foamColor, foamFogMix);
    // Apply Beer's Law for absorption
    vec3 absorbedWaterColor = waterBaseColor * exp((g_vWaterDecayColor.rgb - vec3(1.0)) * g_flWaterDecayStrength * depthBelowSurface);



    float edgeShapeFactor = g_flEdgeShapeEffect;


    /// --- WILL BE WRAPPED -----
    vec3 refractedSceneColor = vec3(0.0);
    //float finalWaterColumnDepthForRefract = waterColumnOpticalDepthFactor;
    float waterOpticalDepthForTrueFog = g_flWaterFogStrength;
    float siltFromEffects = 0.0;



    float heightWithDebris = mix(finalFoamHeightContrib, (finalFoamHeightContrib*0.5+finalDebrisFactor*2.0), debrisVisibilityMask);

    vec3 worldPosForRefractionOrigin= (worldPos+(viewDepOffsetFactor * (mix(0.5,heightWithDebris,edgeShapeFactor)-g_flWaterPlaneOffset)))+(rippleDisplacementAsVec3*-12.0);

    float waterSurfaceViewZ_refract = -(g_matWorldToView * vec4(worldPosForRefractionOrigin,1.0)).z;


    finalWaterColumnDepthForRefract = (max(sceneNormalizedDepth-waterSurfaceViewZ_refract,0.0)*0.01 + refractionDistortionFactor);

    vec3 RwaveN = roughedWaveNormal * currentWaterRoughness;
    //RwaveN.z = sqrt(max(0.0001,1.0-dot(RwaveN.xy,RwaveN.xy)));

    vec2 refractionUVOffsetRaw = (vec2(dot(RwaveN.xy,cross(-viewDir,vec3(0,0,-1)).xy),dot(RwaveN.xy,-viewDir.xy))+(blueNoiseOffset*0.002)*g_flWaterFogStrength) * min(g_flRefractionLimit,finalWaterColumnDepthForRefract);

    //outputColor = vec4(g_flRefractionLimit);
    //return;

    float sceneDepthAtOffsetUV_raw = textureLod(g_tSceneDepth, gbufferUV + refractionUVOffsetRaw,0.0).x;

    //g_flViewportMinZ and MaxZ are just 0.05 and 1.0



    float sceneNormalizedDepthAtOffset = clamp(( sceneDepthAtOffsetUV_raw - g_flViewportMinZ )/(g_flViewportMaxZ - g_flViewportMinZ),0.0,1.0);

    //g_vDepthPsToVsConversion: x = near plane, forgor about the rest, lets pray it is right

    //float sceneViewZAtOffset_refract = -(g_vDepthPsToVsConversion.x/(g_vDepthPsToVsConversion.y*sceneNormalizedDepthAtOffset+g_vDepthPsToVsConversion.z));
    float sceneViewZAtOffset_refract = ( 1.0 / (1.0 * sceneNormalizedDepthAtOffset + 0.0));

    float refractionOffsetAttenuation = clamp(( max(sceneViewZAtOffset_refract - waterSurfaceViewZ_refract, 0.0 ) * 0.01 + refractionDistortionFactor )*10.0, 0.0 , 1.0);


    //TODO: That 10x is needed to make the refracted shit look normal at all
    vec2 finalRefractionUVOffset = refractionUVOffsetRaw * refractionOffsetAttenuation * 1;

    vec2 refractedLookupUV = clamp(gbufferUV+finalRefractionUVOffset ,vec2(0.0),vec2(1.0));

    vec4 rawRefractedColor = texture(g_tSceneColor,refractedLookupUV);
   //outputColor = rawRefractedColor;
   //outputColor = mix(rawRefractedColor, vec4(scaledAccumulatedWaveHeight), scaledAccumulatedWaveHeight + 0.5) * pow(clamp(g_vWaterDecayColor, 0.0, 1.0), vec4(pow(sceneViewZAtOffset_refract, 0.01)));


    /// --- WILL BE WRAPPED -----



    //outputColor.rgb = finalShadingNormal + 0.01 * absorbedWaterColor;

    //texture(g_tDebris, vec2(0.0)).rgb

    //outputColor.rgb = vec3(finalDebrisFactor);
    //outputColor.rgb = mix(outputColor.rgb, texture(g_tDebris, debrisFinalUV).rgb,  clamp(finalDebrisFactor * 4, 0, 1) );
    //outputColor.rgb = g_vWaterDecayColor.rgb + g_vWaterFogColor.rgb;
    //outputColor.rgb = texture(g_tDebris, debrisBaseUV).rgb;
    //outputColor.rgb = foamColor;
    //outputColor.rgb += vec3(finalFoamIntensity) * 1000000;

    //return;


    //outputColor = vec4(blueNoise).rrrr;
}


float fModulo(float value, float divisor)
{
    //return value;
    return value - floor(value /divisor) * divisor;
}
double dModulo(double value, double divisor)
{
    return value;
    return value - floor(value /divisor) * divisor;
}








//            vec3 g_vCameraUpDirWs = normalize(inverse(mat3(g_matWorldToView))[1]);
//            vec3 g_vCameraDirWs = -normalize(inverse(mat3(g_matWorldToView))[2]);
//
//            vec3 refractedViewDir = (-normalize((-viewDir + ((g_vCameraUpDirWs * finalRefractionUVOffset.y) * 2.0)) + ((cross(g_vCameraDirWs, g_vCameraUpDirWs) * (-finalRefractionUVOffset.x)) * 2.0))).xyz;
//            //MATCH?: Replaced a whole couple of things here. Seems to be correct though.
//            mat4 invProj = inverse(g_matViewToProjection);
//            float invProjTerm = fma(sceneNormalizedDepth, invProj[2][3], invProj[3][3]);
//            float perspectiveCorrection = dot(g_vCameraDirWs, viewDir);
//            float sceneViewDistance = (1.f / (invProjTerm * perspectiveCorrection));
//
//            vec3 refractedSceneHitPosWs = g_vCameraPositionWs + normalize(refractedViewDir) * sceneViewDistance;
//
//            //TODO:  = _Globals_.g_bUseTriplanarCaustics != 0;
//            bool useTriplanarCaustics = false;
//
//            //TODO: this is undetermined._m2, what the hell? 
//            vec3 causticsValueTemp = vec3(1.0, 1.0, 1.0);
//
//            vec3 causticsLightDir = sunDir;
//
//            if(useTriplanarCaustics)
//            {
//                vec3 ditheredNormalExtent = abs(ditheredNormal);
//                causticsLightDir = mix(sunDir, mix(mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), vec3(ditheredNormalExtent.y < ditheredNormalExtent.x)), vec3(0.0, 0.0, 1.0), bvec3(ditheredNormalExtent.z > max(ditheredNormalExtent.x, ditheredNormalExtent.y))), vec3(0.65));                                      
//            }
//            vec3 ditheredNormalExtent = abs(ditheredNormal);
//            
//            // ------ TRUE TO DECOMPILE UP TO THIS POINT (with minor differences)-------
//
//            float causticsDepth = worldPosForFoamAndDebrisBase.z - refractedSceneHitPosWs.z;
//
//            vec3 causticRayTarget =  mix(refractedSceneHitPosWs + ((causticsLightDir.xyz * causticsLightDir.z) * causticsDepth), finalSurfacePos.xyz, vec3(clamp((pow(blueNoise.x, 2.0) * foamSiltStrength) * 0.0125, 0.0, 1.0)));
//            float distToCausticTarget = distance(causticRayTarget, refractedSceneHitPosWs);
//
//            vec2 causticDebrisUV = causticRayTarget.xy / g_flDebrisScale;
//
//            
//
//            vec4 causticDebrisSample = texture(g_tDebris, mix(causticDebrisUV, (((causticDebrisUV + (debrisWobbleOffset * finalDebrisVisibility)) + ((viewParallaxFactor * noClue) * 0.1)) + ((foamWobbleAnim * 0.1) * 0.04)) - dominantFoamSiltNorm, depthFactorCoarse).xy, causticsDepth * 0.05);
//
//            float causticDebrisCoverage = clamp((fma(-finalDebrisVisibility, 0.9, causticDebrisSample.w) - debrisEdgeFactor) * 1.1, 0.0, 1.0);
//
//            vec4 _16121;
//            _16121.w = causticDebrisCoverage;
//
//            float causticDepthFalloff = clamp( (1.0 - distToCausticTarget / g_flCausticDepthFallOffDistance), 0.0, 1.0);
//
//            
//
//            float causticBaseIntensity = (causticVisibility * clamp(distToCausticTarget * 0.05, 0.0, 1.0)) * causticDepthFalloff;
//
//            
//
//            if (!useTriplanarCaustics)
//            {
//                causticBaseIntensity *= clamp(dot(ditheredNormal, causticsLightDir.xyz), 0.0, 1.0);
//            }
//
//            
//
//            vec2 causticWaveUVBase = (causticRayTarget.xy * vec2(1.0 / 30)) * g_flCausticUVScaleMultiple;
//
//            vec2 currWaveScale = g_vWaveScale.xy;
//            vec2 currWaveNormalXY = vec2(0);
//            float currWaveDir = g_flWaterInitialDirection;
//
//            float currentWaveAngle = g_flWaterInitialDirection;
//
//            vec2 localUV;
//
//            for(int i = 0; i < 3; i++)
//            {
//                //float iterProgress = float(i) / (float(g_nWaveIterations) - 1.0);
//
//                localUV =
//                fma(
//                vec2(sin(currWaveDir), cos(currWaveDir)) * ((g_flTime * g_flWavesSpeed) * 0.5),
//                sqrt(vec2(1.0) / currWaveScale),
//                (causticWaveUVBase.xy + currWaveNormalXY) / currWaveScale).xy;
//
//                float lodOffset = fma(g_flCausticSharpness, 1.0 - clamp(causticDepthFalloff, 0.0, 1.0), 1.0) * 6.0;
//
//                vec3 rawSample = texture(g_tWavesNormalHeight, localUV, 100).xyz;
//
//
//                currWaveNormalXY.xy += (((((rawSample - vec3(0.5)).xy * 0.5) * g_flCausticDistortion) * (vec2(1.0) + currWaveScale)) * (0.25 + causticDepthFalloff));
//
//
//
//                currWaveScale *= g_flWavesPhaseOffset;
//                currWaveDir += (3.5 / (i + 1));
//            }
//
//
//            vec2 currWaveScale1 = g_vWaveScale.xy;
//            float currWaveDir1 = g_flWaterInitialDirection;
//            vec3 currWaveSampleSum1 = vec3(0.0);
//            float waveSampleCausticDepthFalloff = 1.0 - clamp(causticDepthFalloff, 0.0, 1.0);
//
//
//            for(int i = 0; i < 3; i++)
//            {
//                float causticIterProgress = float(i) / (float(g_nWaveIterations) - 1.0);
//                currWaveSampleSum1 += (((((pow(vec3(texture(g_tWavesNormalHeight, fma(vec2(sin(currWaveDir1), cos(currWaveDir1)) * ((g_flTime * g_flWavesSpeed) * 0.5), sqrt(vec2(1.0) / currWaveScale1), (causticWaveUVBase.xy + currWaveNormalXY) / currWaveScale1).xy, fma(g_flCausticSharpness, waveSampleCausticDepthFalloff, 1.0) * 6.0).z), vec3(waveSampleCausticDepthFalloff * 5.0)) * clamp(mix(mix(fma(debrisDisturbanceForWaves, 0.1, g_flLowFreqWeight), g_flMedFreqWeight + debrisDisturbanceForWaves, clamp(causticIterProgress * 2.0, 0.0, 1.0)), fma(g_flHighFreqWeight, currentWaterRoughness, debrisDisturbanceForWaves), clamp(fma(causticIterProgress, 2.0, -1.0), 0.0, 1.0)), 0.1, 0.4)) * (vec3(1.0) + (currWaveSampleSum1 * 2.0))) * causticDepthFalloff) * waveSampleCausticDepthFalloff) * 2.0);
//                currWaveScale1 *= g_flWavesPhaseOffset;
//                currWaveDir += (3.5 / (i + 1));
//            }
//
//            vec3 subPart = (causticRayTarget.xyz + ((vec3(currWaveNormalXY, 0.0) * 60.0) * currWaveSampleSum1.x));
//            subPart -= g_vCameraPositionWs * 1.0;
//            vec4 causticsClipPos = vec4(subPart, 1.0) * transpose(g_matWorldToProjection);
//            vec2 causticsNdc = causticsClipPos.xy / causticsClipPos.w;
//            vec2 causticsUV = vec2(causticsNdc.x, -causticsNdc.y) * 0.5 - 0.5;
//
//            vec4 causticsEffectsSampleRaw = vec4(-0.5); //texture(g_tWaterEffectsMap, causticsUV) - 0.5;
//
//            vec2 causticsClampedESampleXY = clamp(causticsEffectsSampleRaw.yz * 2.0, 0.0, 1.0);
//
//            vec4 finalCausticsEffectsSample = causticsEffectsSampleRaw;
//            finalCausticsEffectsSample.y = causticsClampedESampleXY.x;
//            finalCausticsEffectsSample.z = causticsClampedESampleXY.y;
//
//            vec4 fadedCausticsEffects = finalCausticsEffectsSample * clamp((((causticsUV.y * (1.0 - causticsUV.y)) * causticsUV.x) * (1.0 - causticsUV.x)) * 40.0, 0.0, 1.0);
//
//            float causticsXOverChangerate = fadedCausticsEffects.x + (fadedCausticsEffects.x / fma(fwidth(fadedCausticsEffects.x), 1000.0, 0.5));
//
//            vec3 causticsModifier = (currWaveSampleSum1 + vec3(fma(clamp(causticsXOverChangerate, 0.0, 1.0) * 4.0, g_flWaterEffectCausticStrength, -((clamp(-causticsXOverChangerate, 0.0, 1.0) * 0.15) * g_flWaterEffectCausticStrength)))) * mix(1.0, 0.0, clamp(fma(causticDebrisCoverage, 2.0, fadedCausticsEffects.y * 0.4), 0.0, 1.0));
//
//            float causticsModifierX = causticsModifier.x;
//            //undetermined._m3.xyz, captures says this value
//            vec4 undet = vec4(1.0, 0.0, 0.0, 0.0);
//
//            vec3 modifiedCausticsRefractColor = darkenedRefractedColor * (vec3(1.0) + (((((pow(max(causticsModifier * (vec3(1.0) + (vec3(1.25, -0.25, -1.0) * (clamp(dFdxFine(causticsModifierX) * 200.0, -1.0, 1.0) * clamp(fma(-causticsModifierX, 3.0, 1.0), 0.0, 1.0)))), vec3(0.001)) * 8.0, vec3(2.5)) * causticBaseIntensity) * undet.xyz) * g_vCausticsTint.xyz) * g_flCausticsStrength) * 0.1));
//
//            float _16517 = pow(dot(modifiedCausticsRefractColor, vec3(0.2125, 0.7154, 0.0721)), 0.2);
//            float _14717 = clamp(dFdxFine(_16517), -1.0, 1.0) + clamp(-dFdyFine(_16517), -1.0, 1.0);
//            
//
//            vec3 _16381 = mix(modifiedCausticsRefractColor, modifiedCausticsRefractColor * (vec3(1.0) + (vec3(2.5, 0.0, -2.0) * float(int(sign(_14717 * clamp(abs(_14717) - 0.1, 0.0, 1.0)))))), vec3(clamp(200.0 / relFragPos, 0.0, 1.0) * 0.1));
//
