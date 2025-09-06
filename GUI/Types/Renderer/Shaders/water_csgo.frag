#version 460

#include "common/utils.glsl"
#include "common/features.glsl"
#include "common/ViewConstants.glsl"
#include "common/LightingConstants.glsl"


#define renderMode_Irradiance 0
#define renderMode_LightmapShadows 0
#define renderMode_Cubemaps 0
#define SCENE_CUBEMAP_TYPE 2
#define F_SPECULAR_CUBE_MAP_ANISOTROPIC_WARP 0
in vec3 vFragPosition;
in vec2 vTexCoordOut;
in vec3 vNormalOut;
in vec3 vTangentOut;
in vec3 vBitangentOut;
in vec4 vColorBlendValues;


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
#define F_INTERACTION_EFFECTS 0
#define F_BLUR_REFRACTION 0

//TODO: set all the defaults, all of them. If a water material doesn't contain them, shit breaks.

//H7per: No clue if settings this to bool breaks it, might need testing
uniform bool g_bDontFlipBackfaceNormals;
uniform bool g_bRenderBackfaceNormals;

//uniform vec4 g_vSimpleSkyReflectionColor;

uniform float g_flWaterPlaneOffset;
uniform float g_flSkyBoxScale;
uniform float g_flSkyBoxFadeRange;
uniform vec2 g_vMapUVMin;
uniform vec2 g_vMapUVMax;
uniform float g_flLowEndCubeMapIntensity;
uniform float g_flWaterRoughnessMin;
uniform float g_flWaterRoughnessMax;
uniform float g_flFoamMin;
uniform float g_flFoamMax;
uniform float g_flDebrisMin;
uniform float g_flDebrisMax;
uniform vec3 g_vDebrisTint;
uniform float g_flDebrisReflectance = 0.1f;
uniform float g_flDebrisOilyness;
uniform float g_flDebrisNormalStrength = 1.0f;
uniform float g_flDebrisEdgeSharpness = 10.f; //this is a default value, don't fuck with it
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
uniform vec2 g_vWaveScale;
uniform float g_flWaterInitialDirection;
uniform float g_flWavesSpeed;
uniform float g_flLowFreqWeight;
uniform float g_flMedFreqWeight;
uniform float g_flHighFreqWeight;
uniform float g_flWavesPhaseOffset;
uniform float g_flEdgeHardness;
uniform float g_flEdgeShapeEffect;
uniform int g_nWaveIterations;
uniform vec3 g_vWaterFogColor;
uniform float g_flRefractionLimit;
uniform float g_flWaterFogStrength;
uniform float g_flRefractSampleOffset;
uniform float g_flRefractChromaticSeparation;
uniform vec3 g_vWaterDecayColor;
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
uniform sampler2D g_tDebris; // SrgbRead(true)
uniform sampler2D g_tDebrisNormal;

uniform samplerCube g_tLowEndCubeMap; // SrgbRead(true)

uniform sampler2D g_tWaterEffectsMap;
uniform sampler2D g_tParticleShadowBuffer;
uniform sampler3D g_tLightCookieTexture;
uniform sampler2D g_tMoitFinal;
uniform sampler2D g_tWavesNormalHeight;


#if (F_REFLECTION_TYPE == 0)
    uniform vec4 g_vSimpleSkyReflectionColor = vec4(1.0);
#endif

//uniform sampler2D g_tSceneColor;
//uniform sampler2D g_tSceneDepth;

//#if (F_REFRACTION == 1)
    uniform sampler2D g_tSceneColor;
    uniform sampler2D g_tSceneDepth;
//#endif

vec3 sunColor = GetLightColor(0);
vec3 sunDir = GetEnvLightDirection(0);
float g_flLocalTime = 370.234375;
//#define g_flTime g_flLocalTime


bool HandleRenderingModes()
{
    MaterialProperties_t mat;
    LightingTerms_t lighting;

    InitProperties(mat, vNormalOut);

    if(g_iRenderMode == renderMode_Irradiance)
    {
        CalculateIndirectLighting(lighting, mat);
        outputColor.rgb = lighting.DiffuseIndirect;
        return true;
    }
    else if(g_iRenderMode == renderMode_Cubemaps)
    {
        // No bumpmaps, full reflectivity
        vec3 viewmodeEnvMap = GetEnvironment(mat).rgb;
        outputColor.rgb = viewmodeEnvMap;
        return true;
    }
    else if (g_iRenderMode == renderMode_Normals)
    {
        outputColor = vec4(SrgbGammaToLinear(PackToColor(mat.GeometricNormal)), 1.0);
        return true;
    }
    #if (D_BAKED_LIGHTING_FROM_LIGHTMAP == 1)
    else if (g_iRenderMode == renderMode_LightmapShadows)
    {
        #if (S_LIGHTMAP_VERSION_MINOR >= 2)
            vec4 dlsh = texture(g_tDirectLightShadows, vLightmapUVScaled);
            outputColor = vec4(vec3(1.0 - dlsh.x) + vec3(1.0 - min3(dlsh.yzw)) * vec3(0.5, 0.5, 0), 1.0);
            return true;
        #endif
    }
#endif
    #if (D_BAKED_LIGHTING_FROM_LIGHTMAP == 1)
    else if(g_iRenderMode == renderMode_LightmapUvDensity)
    {
        outputColor.rgb = vec3(0.2);

        vec2 uv = vLightmapUVScaled.xy;

        ivec2 vDims = textureSize(g_tIrradiance, 0).xy;

        uint testVal = ((uv.x < 0) != (uv.y < 0)) ? 0 : 1;
        uvec2 vUVInPixels = uvec2(abs(uv) * vDims.xy);
        if (((vUVInPixels.x + vUVInPixels.y) & 1) == testVal)
        {
            outputColor.rgb *= 0.8;
        }

        uvec2 vUVIn16Pixels = vUVInPixels / 16;
        if (((vUVIn16Pixels.x + vUVIn16Pixels.y) & 1) == testVal)
        {
            outputColor.rgb *= 0.5;
        }

        return true;
    }
    #endif
    return false;
}

void main()
{
    if(HandleRenderingModes()) return;

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
    // We don't do this yet, but its there for when we do
    ivec2 momentTexelCoords = ivec2(fragCoord.xy * g_flForceMixResolutionScale);
    float visibilityFromMoment = exp(-texelFetch(g_tZerothMoment, momentTexelCoords, 0).x);
    float occlusionFactor = 1.0 - visibilityFromMoment;
    if (occlusionFactor > 0.9998999834060669) { discard; }

    // --- Skybox Scale Effect & Blue Noise ---

    //bvec4 otherEnabledVec = notEqual(g_bOtherEnabled3, ivec4(0));
    //bool isSkybox = otherEnabledVec.x;

    bool isSkybox = g_bIsSkybox;

    float SkyboxScale;
    if (isSkybox)
    {
        SkyboxScale = g_flSkyBoxScale;
    }
    else
    {
        SkyboxScale = 1.0;
    }
    //TODO: Whats up with this mask?
    //vec4 NoiseValue = texelFetch(g_tBlueNoise, ivec3(ivec2(FragCoord.xy) & PerViewConstantBufferCsgo_t.g_vBlueNoiseMask, 0).xy, 0);

    vec4 blueNoise = texelFetch(g_tBlueNoise, ivec2(mod(fragCoord.xy, textureSize(g_tBlueNoise, 0))), 0);
    vec2 blueNoiseOffset = blueNoise.xy - 0.5;
    float blueNoiseDitherFactor = blueNoiseOffset.x * 2.0;

    // --- Position & View Vectors ---

    //FragCoord.xy * PerViewConstantBuffer_t.g_vInvGBufferSize.xy in decompile
    vec2 gbufferUV = fragCoord.xy / textureSize( g_tSceneColor, 0);
    vec3 relFragPos = worldPos - g_vCameraPositionWs;
    vec3 viewDir = normalize(relFragPos);

    vec3 invViewDir = -viewDir;
    float distanceToFrag = length(relFragPos) * SkyboxScale;

    vec3 viewDepOffsetFactor = mix(vec3(viewDir.xy / viewDir.z, sqrt(-viewDir.z)), vec3(0.0), vec3(isSkybox));
    vec2 viewParallaxFactor = (viewDir.xy) / (-viewDir.z + 0.25);

    vec2 worldSpaceUV = (worldPos.xy - g_vMapUVMin.xy) / (g_vMapUVMax.xy - g_vMapUVMin.xy);
    worldSpaceUV.y = 1.0 - worldSpaceUV.y;

    float fragDepth = gl_FragCoord.z;
    //^ my own addition, from distance and depth, you can get a multiplier for any depth sample taken at gbufferUV from depth to true distance
    // easier than doing it through some inverse matrix columns

    
    //The following is not in the direct decompile either, but the inverse offset like this exists atleast once
    vec3 worldPosToCamera = g_vCameraPositionWs - worldPos;

    float waterSurfaceViewZ = -(g_matWorldToView * vec4(worldPos, 1.0) ).z;
    vec3 cameraDirWs = -normalize(inverse(mat3(g_matWorldToView))[2]);
    

    // ---- Skybox corrected projection stuff ---------

    //Gemini suggested this one below but its not even used here yet. Again TODO to check that
    //vec3 scaledRelFragPos = relFragPos * SkyboxScale;
    //vec3 horChangerateSqrtZ = mix( vec3(invViewDir.xy / invViewDir.z, sqrt(invViewDir.z)), vec3(0.0), isSkybox);
    

    //---COLLECTING WORLD DEPTH/POSITION INFO (i.e. ignoring the water plane) for refraction depth etc---

    float refractionDistortionFactor = 0.0;
    float waterColumnOpticalDepthFactor = 1.0;
    vec4 sceneColorSample = vec4(0.0);
    float sceneNormalizedDepth = 1.0;
    vec3 sceneHitPositionWs = vec3(0.0);
    

    //What the fuck is this for? TODO, also not in the raw decompile
    float sceneViewDistance = -0.95;

    //TODO: I don't think this is #if'ed in the original. I recall seeing the water normals be modified from color
    //#if F_REFRACTION == 1
    if (!isSkybox) {

        float sceneDepth = textureLod(g_tSceneDepth, gbufferUV, 0.0).x;
        sceneNormalizedDepth = clamp((sceneDepth - g_flViewportMinZ) / (g_flViewportMaxZ - g_flViewportMinZ), 0.0, 1.0);
        sceneNormalizedDepth = max(sceneNormalizedDepth, 0.00001);

        float normalizedFragDepth = (fragDepth - g_flViewportMinZ) / (g_flViewportMaxZ - g_flViewportMinZ);
        sceneViewDistance = (1 / sceneNormalizedDepth) * ( distanceToFrag / (1.0 / normalizedFragDepth));
        sceneHitPositionWs = g_vCameraPositionWs + viewDir * sceneViewDistance;

        sceneColorSample = texture(g_tSceneColor, gbufferUV);
        float sceneColorLuminance = clamp(dot(sceneColorSample.rgb, vec3(0.2125, 0.7154, 0.0721)), 0.0, 0.4);
        refractionDistortionFactor = sceneColorLuminance * -0.03;
        float waterSurfaceViewZ = -(g_matWorldToView * vec4(worldPos, 1.0)).z;
        waterColumnOpticalDepthFactor = (refractionDistortionFactor * 1.0 + max((1.0 / sceneNormalizedDepth) - waterSurfaceViewZ, 0.0) * 0.01);

    }
    //#endif


    float adjustedWaterColumnDepth = max(0.0, waterColumnOpticalDepthFactor - 0.02);
    float waterColumnDepthVertical = waterColumnOpticalDepthFactor * invViewDir.z;



    // --- Get Roughness, Foam and Debris ----
    float currentWaterRoughness = max(0.0, mix(g_flWaterRoughnessMin, g_flWaterRoughnessMax, vColorBlendValues.x));

    if(isSkybox)
    {
        currentWaterRoughness = g_flWaterRoughnessMax;
    }
    float currentFoamAmount = isSkybox ? 0.0 : max(0.0, mix(g_flFoamMin, g_flFoamMax, vColorBlendValues.y));
    float currentDebrisVisibility = (isSkybox ? 0.0 : max(0.0, mix(g_flDebrisMin, g_flDebrisMax, vColorBlendValues.z)));

    vec2 baseWaveUV = (worldPos.xy * SkyboxScale + viewDepOffsetFactor.xy * (0.5 - g_flWaterPlaneOffset)) / 30.f; // Another arbitrary scale
    //y is negative vs decompile because its flipped in their context  
    vec2 baseWaveUVDx = dFdx(baseWaveUV);
    vec2 baseWaveUVDy = -dFdy(baseWaveUV);

    float reflectionsLodFactor = (0.5 * pow(max(dot(baseWaveUVDx, baseWaveUVDx), dot(baseWaveUVDy, baseWaveUVDy)), 0.1)) * g_flReflectionDistanceEffect;



    //(fragCoord.xy - g_vViewportOffset.xy) * g_vInvViewportSize.xy * g_vViewportToGBufferRatio.xy, just assuming a size of SceneColor and ratio of 1.0
    vec2 waterEffectsMapUV = gbufferUV;
    vec4 waterEffectsSampleRaw = vec4(vec3(0.5), 0.0); //texture(g_tWaterEffectsMap, waterEffectsMapUV);
    vec2 waterEffectsDisturbanceXFoamY = clamp((waterEffectsSampleRaw.yz - 0.5) * 2.0, 0.0, 1.0);
    float waterEffectsFoam = waterEffectsDisturbanceXFoamY.y;

    float totalDisturbanceStrength = (waterEffectsDisturbanceXFoamY.x + waterEffectsDisturbanceXFoamY.y) * g_flWaterEffectDisturbanceStrength;
    float scaledDisturbanceStrength = totalDisturbanceStrength * 0.25;
    float clampedReflLodFactor = clamp(reflectionsLodFactor, 0.0, 0.5);

    //---RECONSTRUCT NORMAL FROM DEPTH (modified by luminance to get "normals from luma" as a cheap approximation, the user won't care :^) )---
    vec3 lumaShiftedPos = sceneHitPositionWs + viewDepOffsetFactor * clamp(GetLuma(sceneColorSample.rgb), 0.0, 0.4);

    vec3 lumaShiftedPosDdx = dFdx(lumaShiftedPos);
    vec3 lumaShiftedPosDdy = -dFdy(lumaShiftedPos);

    vec3 reconstructedWorldNormal = -normalize(cross(lumaShiftedPosDdx, lumaShiftedPosDdy));


    float timeAnim = g_flTime * 3.0 + sin(g_flTime * 0.5) * 0.1;


    vec2 depthFactorLarge = vec2(clamp(adjustedWaterColumnDepth * 10.0, 0.0, 1.0));
    vec2 depthFactorSmall = vec2(clamp(adjustedWaterColumnDepth * 4.0, 0.0, 1.0));

    float sceneDepthChangeMagnitude = fwidth(sceneNormalizedDepth);

    //TODO: this can just be reconstructedWorldNormal.xy += blueNoiseOffset * 0.05;
    //vec2 ditheredReconstructedWorldNormalXY = reconstructedWorldNormal.xy + blueNoiseOffset * 0.05;
    reconstructedWorldNormal.xy += blueNoiseOffset * 0.05;
    

    // ------ WAVE LOGIC -------
    vec2 accumulatedWaveUVOffset = vec2(0.0); // For UV distortion by waves
    vec2 currentWaveTexScale = g_vWaveScale.xy;
    vec3 accumulatedWaveNormal = vec3(0.0, 0.0, 1.0); // Start with up vector
    float accumulatedWaveHeight = 0.0;
    vec2 accumulatedPhaseOffset = vec2(0.0);
    
    float currentWaveAngle = g_flWaterInitialDirection;


    
    for (uint i = 0; i < g_nWaveIterations; ++i)
    {
        float iterProgress = float(i) / (float(g_nWaveIterations) - 1.0);

        // Weight for this wave octave (low, med, high frequencies)

        float lowFreqWeight = fma(totalDisturbanceStrength, 0.05, g_flLowFreqWeight);
        float medFreqWeight = fma(totalDisturbanceStrength, 0.25, g_flMedFreqWeight);

        float lowMedBlend = clamp(iterProgress * 2.0, 0.0, 1.0);
        float medHighBlend = clamp(iterProgress * 2.0 - 1.0, 0.0, 1.0);

        

        float lowMedWeightedAmplitude = mix(
        lowFreqWeight,
        medFreqWeight,
        lowMedBlend
        );

        float freqWeight = mix(
            lowMedWeightedAmplitude,
            g_flHighFreqWeight * currentWaterRoughness + scaledDisturbanceStrength, // Roughness makes high-freq waves stronger
            medHighBlend
        );

        // Sample wave texture: RG=Normal, B=Height (all signed, centered at 0.5)
        vec2 waveAnimOffset = vec2(sin(currentWaveAngle), cos(currentWaveAngle)) * (g_flTime * g_flWavesSpeed) * 0.5;
        vec2 anisoUV = waveAnimOffset * inversesqrt(currentWaveTexScale); // Anisotropic speed based on scale

        vec2    waveSampleUV1 =  anisoUV + (baseWaveUV + accumulatedWaveUVOffset * 3.0 + accumulatedPhaseOffset) / currentWaveTexScale;
        vec3    sampledWaveNormalHeight1 = texture(g_tWavesNormalHeight, waveSampleUV1, -clampedReflLodFactor).xyz - vec3(0.5);
        float   waveHeightComponent1 = sampledWaveNormalHeight1.z * freqWeight * length(currentWaveTexScale) * 0.01; // Height contribution

        vec2    waveNormalXYComponent1 = sampledWaveNormalHeight1.xy * 2.0; // Unpack normal
        waveNormalXYComponent1.x    *= min(1.0, currentWaveTexScale.y / currentWaveTexScale.x);
        waveNormalXYComponent1.y    *= min(1.0, currentWaveTexScale.x / currentWaveTexScale.y);
        waveNormalXYComponent1      *= (freqWeight * 0.1); // Scale normal contribution

        vec2 gerstnerDisplacement = (-viewParallaxFactor) * (waveHeightComponent1) * g_flWavesHeightOffset * currentWaterRoughness;

        vec2 waveNormalDisplacement = ((waveNormalXYComponent1 * g_flWavesSharpness) * currentWaveTexScale) * g_flWavesPhaseOffset;


        vec2 waveSampleUV2 = anisoUV + (baseWaveUV + (accumulatedWaveUVOffset + gerstnerDisplacement) * 3.0 + accumulatedPhaseOffset + waveNormalDisplacement) / currentWaveTexScale;
        vec3  sampledWaveNormalHeight2 = texture(g_tWavesNormalHeight, waveSampleUV2, -clampedReflLodFactor).xyz - vec3(0.5);

        vec2 waveNormalXYComponent2 = sampledWaveNormalHeight2.xy * 2.0;
        waveNormalXYComponent2.x    *= min(1.0, currentWaveTexScale.y / currentWaveTexScale.x);
        waveNormalXYComponent2.y    *= min(1.0, currentWaveTexScale.x / currentWaveTexScale.y);
        waveNormalXYComponent2      *= (freqWeight * 0.1);

        accumulatedWaveUVOffset     += gerstnerDisplacement;
        accumulatedWaveNormal.xy    += waveNormalXYComponent2;
        accumulatedPhaseOffset      += waveNormalDisplacement;
     
        currentWaveTexScale         *= g_flWavesPhaseOffset; // e.g., smaller scale for higher frequency


        float waveHeightComponent2 = sampledWaveNormalHeight2.z * freqWeight * length(currentWaveTexScale) * 0.01;
        accumulatedWaveHeight += waveHeightComponent2; // Scale factor
        currentWaveAngle += 3.5 / float(i + 1u); // Change angle to avoid repetition
    }
    vec2 finalWavePhaseOffset = accumulatedPhaseOffset * 0.1;
    vec3 roughedWaveNormal = accumulatedWaveNormal * currentWaterRoughness;
    float scaledAccumulatedWaveHeight = accumulatedWaveHeight * currentWaterRoughness * 60.0; // For stronger visual effect

 
    //---CONSTRUCT EDGE BLEND FACTOR (this is used to blend between the reconstructed normal and the base wave normal, for the roll-up effect and later blending for waterheight)---
    vec3 reconstructedWorldSurfaceNormal = vec3(0.0, 0.0, 1.0);
    float edgeBlendFactor = g_flEdgeShapeEffect;
    #if F_REFRACTION == 1
        if (!isSkybox)
        {
            reconstructedWorldSurfaceNormal = reconstructedWorldNormal;
            //reconstructedWorldSurfaceNormal.x = ditheredReconstructedWorldNormalXY.x;
            //reconstructedWorldSurfaceNormal.y = ditheredReconstructedWorldNormalXY.y;
            edgeBlendFactor = g_flEdgeShapeEffect * clamp(fma(-reconstructedWorldNormal.z, 1.0 - clamp(waterColumnDepthVertical * 8.0, 0.0, 1.0), 1.2), 0.0, 1.0);
        }
    #endif

    //vec3 waveDisplacedWorldPos = worldPos + viewDepOffsetFactor.xyz * (mix(0.5, scaledAccumulatedWaveHeight, g_flEdgeShapeEffect) - g_flWaterPlaneOffset) * 1;

    
    float foamFromEffects = 0.0;
    float siltFromEffects = 0.0;
    vec2 foamEffectDisplacementXY = vec2(0.0);
    vec2 debrisEffectsNormalXY = vec2(0.0);
    vec2 foamSiltEffectNormalXY = vec2(0.0);

    float debrisDisturbanceForWaves = g_flWaterEffectDisturbanceStrength * 0.25;

    vec3 effectsSamplePos = worldPos.xyz + (viewDepOffsetFactor * (mix(0.5, scaledAccumulatedWaveHeight, edgeBlendFactor) - g_flWaterPlaneOffset));

    float finalWaveheightWithEffects = scaledAccumulatedWaveHeight;
    
    
    float finalFoam = waterEffectsFoam;

    // ----READ FROM EFFECTS MAP FOR DECAL BASED EFFECTS (shots, people running through water, etc...)
    if(!isSkybox)
    {
        vec3 effectsPos0 = (worldPos + (viewDepOffsetFactor * (mix(0.0, scaledAccumulatedWaveHeight, edgeBlendFactor) - g_flWaterPlaneOffset))) + (vec3(roughedWaveNormal.xy, 0.0) * (-16.0));
        vec4 effectsPos0Transformed = g_matWorldToProjection* (vec4(effectsPos0 - g_vCameraPositionWs, 1.0));
        vec2 effectsPos0NcdCoords = effectsPos0Transformed.xy / effectsPos0Transformed.w;

        //TODO: Do we need a GBuffer ratio? 1.0 is gbuffer ratio in decompile, but I am just setting 1 here.
        vec4 effectsSample0 = vec4(vec3(0.5), 0.0) - 0.5; //texture(g_tWaterEffectsMap,  ((vec2(effectsPos0NcdCoords.x, -effectsPos0NcdCoords.y) * 0.5) + vec2(0.5)).xy * 1.0    ) - vec4(0.5);

        

        vec3 effectsPos1 = effectsPos0 + (viewDepOffsetFactor * fma(20.0, effectsSample0.x, 2.0 * clamp(effectsSample0.yz * 2.0, vec2(0.0), vec2(1.0)).x));
        vec4 effectsPos1Transformed = g_matWorldToProjection * (vec4(effectsPos1.xyz, 1.0) - vec4(g_vCameraPositionWs, 1.0)).xyzw;
        vec2 effectsPos1NcdCoords = effectsPos1Transformed.xy / effectsPos1Transformed.w;
        //Same as before, gbuffer ratio??
        vec2 effectsPos1UV = ((vec2(effectsPos1NcdCoords.x, -effectsPos1NcdCoords.y) * 0.5) + vec2(0.5)).xy * 1.0;



        vec4 effectsSample1 = vec4(vec3(0.5), 0.0) - 0.5; //texture(g_tWaterEffectsMap, effectsPos1UV);

        vec2 rippleFoamFromEffectsMap = clamp(effectsSample1.yz*2.0,0.0,1.0);


        vec4 offsetClipPosX = g_matWorldToProjection * (vec4(effectsPos1 - g_vCameraPositionWs +    vec3(1,  0, 0)     ,1.0));
        vec4 offsetClipPosY = g_matWorldToProjection * (vec4(effectsPos1 - g_vCameraPositionWs +    vec3(0, -1, 0)   ,1.0));

        //float rippleBaseFromEffectsMap = rippleFoamFromEffectsMap.x;
        //float foamBaseFromEffectsMap = rippleFoamFromEffectsMap.y;


        vec4 _24771;
        _24771.z = rippleFoamFromEffectsMap.y;

        

        vec2 offsetNdcX = offsetClipPosX.xy / offsetClipPosX.w;
        vec2 offsetNdcY = offsetClipPosY.xy / offsetClipPosY.w;
        //again gbuffer ratio
        vec2 duv_dx_approx = (( (vec2(offsetNdcX.x,-offsetNdcX.y) * 0.5 ) + 0.5 ) * 1.0 ) - effectsPos1UV;
        vec2 duv_dy_approx = (( (vec2(offsetNdcY.x,-offsetNdcY.y) * 0.5 ) + 0.5 ) * 1.0 ) - effectsPos1UV;
        vec2 stepScale = vec2(0.0004)/ vec2(length(duv_dx_approx),length(duv_dy_approx));



        vec4 xOffsetEffectsSample = vec4(vec3(0.5), 0.0) - 0.5; //texture(g_tWaterEffectsMap, effectsPos1UV * 1.0 + normalize(duv_dx_approx) * 0.005) - 0.5;
        vec4 yOffsetEffectsSample = vec4(vec3(0.5), 0.0) - 0.5; //texture(g_tWaterEffectsMap, effectsPos1UV * 1.0 + normalize(duv_dy_approx) * 0.005) - 0.5;

        vec2 rippleFoamDX = clamp(xOffsetEffectsSample.yz * 2.0, vec2(0.0), vec2(1.0));
        vec2 rippleFoamDY = clamp(yOffsetEffectsSample.yz * 2.0, vec2(0.0), vec2(1.0));
       
        foamEffectDisplacementXY = (normalize(cross(vec3(stepScale.x, 0, effectsSample1.x - xOffsetEffectsSample.x),vec3(0, stepScale.y, effectsSample1.x - yOffsetEffectsSample.x))).xy*vec2(-1, 1)) * (abs(effectsSample1.x) * 4.0) * g_flWaterEffectsRippleStrength;

        finalWaveheightWithEffects += effectsSample1.x * g_flWaterEffectsRippleStrength * 12;

        foamFromEffects = rippleFoamFromEffectsMap.x * g_flWaterEffectFoamStrength;
        siltFromEffects = rippleFoamFromEffectsMap.y * g_flWaterEffectSiltStrength;
        

        debrisEffectsNormalXY = normalize(cross(vec3(stepScale.x, 0, rippleFoamFromEffectsMap.x - rippleFoamDX.x), vec3(0.0, stepScale.y, rippleFoamFromEffectsMap.x - rippleFoamDY.x))).xy * vec2(-1.0, 1.0);

        debrisDisturbanceForWaves = ((effectsSample1.x + effectsSample1.y ) * g_flWaterEffectDisturbanceStrength) * 0.25;

        finalFoam = rippleFoamFromEffectsMap.y;
        foamSiltEffectNormalXY = (normalize(cross(vec3(stepScale.x, 0, effectsSample1.y -rippleFoamDX.y), vec3(0, stepScale.y, effectsSample1.y - rippleFoamDY.y))).xy*vec2(-1, 1)) * pow(effectsSample1.y, 3.5); // Original used rippleFoam_plusDY.y


        effectsSamplePos = worldPos.xyz + (viewDepOffsetFactor * (mix(0.5, finalWaveheightWithEffects, edgeBlendFactor) - g_flWaterPlaneOffset)) + (vec3(foamEffectDisplacementXY.xy, 0.0) * (-4.0));
    }

    vec3 rippleDisplacementAsVec3 = vec3(foamEffectDisplacementXY, 0.0);

    vec3 worldPosForFoamAndDebrisBase = (worldPos + (viewDepOffsetFactor * (mix(0.5, finalWaveheightWithEffects, edgeBlendFactor * 0.5) - g_flWaterPlaneOffset))) + (rippleDisplacementAsVec3 * (-2.0));

    vec2 foamWobbleAnim = vec2(sin(effectsSamplePos.y * 0.07 + timeAnim), cos(effectsSamplePos.x * 0.07 + timeAnim));
    vec2 foamBaseUV = (worldPosForFoamAndDebrisBase.xy / g_flFoamScale);
    vec2 foamDistortedUV =  (foamBaseUV + finalWavePhaseOffset * g_flFoamWobble * 0.5 * (1.0 - currentFoamAmount))  - (foamSiltEffectNormalXY / g_flFoamScale);    
    float secondaryFoamWobbleStrength = finalFoam + 0.05;


    vec4 foamSample1 = texture(g_tFoam, mix(foamBaseUV, foamDistortedUV + (foamWobbleAnim * secondaryFoamWobbleStrength * 0.03), depthFactorLarge) );
    vec2 sample2Mix1 = foamBaseUV.yx * 0.731;
    vec2 sample2Mix2 = (foamDistortedUV.yx * 0.731) + ((vec2(sin(fma(effectsSamplePos.y, 0.06, timeAnim)), cos(fma(effectsSamplePos.x, 0.06, timeAnim))) * secondaryFoamWobbleStrength) * 0.02);
    vec4 foamSample2 = texture(g_tFoam, mix(sample2Mix1, sample2Mix2, depthFactorLarge)); // Second sample with different UVs/anim for variation

    float combinedFoamTextureValue = ( sin(blueNoise.x) * 0.125 + max(foamSample1.z, foamSample2.z) );

    float finalFoamIntensity = fma(    currentFoamAmount * fma(finalWaveheightWithEffects, 0.008, 1.0),       1.0 - clamp(debrisDisturbanceForWaves * 2.0, 0.0, 1.0),       foamFromEffects   );
    finalFoamIntensity = clamp(finalFoamIntensity, 0.0, 1.0);


    float finalFoamPow1_5 = pow(finalFoam, 1.5);


    vec2 debrisBaseUV = worldPosForFoamAndDebrisBase.xy / g_flDebrisScale;


    vec2 debrisWobbleOffset = finalWavePhaseOffset * g_flDebrisWobble;

    float absFoamSiltX = abs(foamSiltEffectNormalXY.x);
    float absFoamSiltY = abs(foamSiltEffectNormalXY.y);

    float _15937 = foamSiltEffectNormalXY.y * float(absFoamSiltY > absFoamSiltX);

    vec2 dominantFoamSiltNorm = (vec2(foamSiltEffectNormalXY.x * float(absFoamSiltX > abs(_15937)), _15937) / g_flDebrisScale) * 400.0;

    vec2 debrisDistortedUV = ((debrisBaseUV + (debrisWobbleOffset * (1.0 - currentDebrisVisibility))));

    debrisDistortedUV += ((viewParallaxFactor * (fma(sin(finalFoam * 50.0) * 4.0, clamp(0.1 - finalFoamPow1_5, 0.0, 1.0), 1.0) * finalFoamPow1_5)) * 0.1);
    debrisDistortedUV +=  ((foamWobbleAnim * (0.1 + finalFoam)) * 0.02);
    debrisDistortedUV -=  dominantFoamSiltNorm;

    

    vec2 debrisFinalUV = mix(debrisBaseUV, debrisDistortedUV, depthFactorSmall).xy;

    vec4 debrisColorHeightSample = texture(g_tDebris, debrisFinalUV, finalFoamPow1_5 * 3.0); // RGB=color, A=height/mask
    float debrisHeightVal = debrisColorHeightSample.a - 0.5; // Signed height

    #if (F_INTERACTION_EFFECTS == 1)
        float finalDebrisVisibility = fma(-currentDebrisVisibility, clamp(1.4 - (finalFoam / mix(1.0, 0.4, debrisColorHeightSample.w)), 0.0, 1.0), 1.0);
    #else
        float finalDebrisVisibility = 1.0 - currentDebrisVisibility;
    #endif

    float debrisEdgeFactor = clamp((debrisColorHeightSample.a - finalDebrisVisibility) * g_flDebrisEdgeSharpness, 0.0, 1.0);

    float noClue = max(0.0, fma(2.0, finalFoamPow1_5, debrisHeightVal * (-2.0)));
    float weirdDebHeight = max(0.0, debrisHeightVal * (-2.0));

    float debrisVisibilityMask = clamp(fma(-noClue, 10.0, 1.0), 0.0, 1.0);


    float finalDebrisFactor = debrisVisibilityMask * debrisEdgeFactor; // Final alpha for debris layer

    vec3 debrisNormalSample = texture(g_tDebrisNormal, debrisFinalUV).xyz - vec3(0.5); // Sample and un-pack
    debrisNormalSample.y *= -1.0;

    

    vec2 debrisNormalXY = debrisNormalSample.xy * g_flDebrisNormalStrength;

    float combinedSurfaceCoverage = clamp(fma(-debrisVisibilityMask, debrisEdgeFactor, fma(finalFoamIntensity * combinedFoamTextureValue, 0.25, clamp(finalFoamIntensity - (1.0 - combinedFoamTextureValue), 0.0, 1.0) * 0.75)), 0.0, 1.0);

    float finalSurfaceHeight = mix(finalWaveheightWithEffects, fma(finalWaveheightWithEffects, 0.5, debrisHeightVal * 2.0), finalDebrisFactor);

    vec3 finalSurfacePos = effectsSamplePos;
    float finalWaterColumnDepthForRefract = waterColumnOpticalDepthFactor;

    if(!isSkybox)
    {
        finalSurfacePos = worldPos.xyz + (viewDepOffsetFactor * (mix(0.5, finalSurfaceHeight, edgeBlendFactor) - g_flWaterPlaneOffset)) + vec3(foamEffectDisplacementXY, 0.0) * (-12.0);

        float fmaM1 = max(   (   1.0 / fma(1.0, sceneNormalizedDepth, 0.0)   ) - -(g_matWorldToView * vec4(finalSurfacePos.xyz, 1.0).xyzw).z, 0.0);

        finalWaterColumnDepthForRefract = fma(fmaM1, 0.01, refractionDistortionFactor);
    }
    float surfaceCoverageAlpha = clamp(debrisEdgeFactor + combinedSurfaceCoverage, 0.0, 1.0);

    vec2 finalWaveNormalXY = (((roughedWaveNormal.xy * 2.0) * g_flWavesNormalStrength) * mix(1.0, 2.0, reflectionsLodFactor)) * 1.0; // Stronger at glancing angles
    finalWaveNormalXY *= fma(clamp(0.2 - finalWaterColumnDepthForRefract, 0.0, 1.0), 8.0, 1.0);
    finalWaveNormalXY += ((debrisNormalXY * finalDebrisFactor) * 1.5);
    finalWaveNormalXY += (mix(foamSample1.xy - vec2(0.5), foamSample2.xy - vec2(0.5), vec2(float(foamSample2.z > foamSample1.z))).xy * combinedSurfaceCoverage);
    finalWaveNormalXY += ((debrisEffectsNormalXY.xy * combinedSurfaceCoverage) * 0.5);
    finalWaveNormalXY += ((foamEffectDisplacementXY.xy * (1.0 - clamp(fma(debrisVisibilityMask, debrisEdgeFactor, combinedSurfaceCoverage), 0.0, 1.0))) * 2.0);
    finalWaveNormalXY *= (vec2(1.0) + ((blueNoiseOffset * 2.0) * g_flWavesNormalJitter));

    vec3 surfaceNormal = vec3(finalWaveNormalXY, sqrt(1.0 - clamp(dot(finalWaveNormalXY, finalWaveNormalXY), 0.0, 1.0)));
    vec2 perturbedNormalXY = surfaceNormal.xy * 3.0; // Stronger perturbation
    

    vec3 perturbedSurfaceNormal = vec3(perturbedNormalXY, sqrt(1.0 - clamp(dot(perturbedNormalXY, perturbedNormalXY), 0.0, 1.0)));
    //TODO: we can contract this
    vec3 finalSurfaceNormal = surfaceNormal;
    vec3 finalPerturbedSurfaceNormal = perturbedSurfaceNormal;

    //#if F_REFRACTION == 1
        if (!isSkybox)
        {
            float _20589 = mix(60.0, 120.0, reconstructedWorldSurfaceNormal.z);
            vec3 edgeLimitFactor = vec3((clamp(fma(-sceneDepthChangeMagnitude, 1000.0, clamp(((1.0 / _20589) - finalWaterColumnDepthForRefract) * _20589, 0.0, 1.0) + clamp((0.025 - finalWaterColumnDepthForRefract) * 8.0, 0.0, 1.0)), 0.0, 1.0) / fma(distanceToFrag, 0.002, 1.0)) * 0.6);
            finalSurfaceNormal = normalize(mix(surfaceNormal, reconstructedWorldSurfaceNormal, edgeLimitFactor));
            finalPerturbedSurfaceNormal = normalize(mix(perturbedSurfaceNormal, reconstructedWorldSurfaceNormal, edgeLimitFactor));

        }
    //#endif

    float cosNormAngle = clamp(dot(-viewDir, finalPerturbedSurfaceNormal.xyz), 0.0, 1.0);
    float fresnel = pow(1.0 - cosNormAngle, g_flFresnelExponent);
    vec3 finalFoamColor = g_vFoamColor.rgb * fma(combinedSurfaceCoverage, 0.5, 1.0);
    
    vec3 combinedRefractedColor = vec3(0);
    vec4 causticsDebrisTotal = vec4(0.0);
    float causticsEffectsZ = 0.0;
    float postRefractionWaterColumnDepth = finalWaterColumnDepthForRefract;
    float inscatterStrength = g_flWaterFogStrength;

    if(!isSkybox)
    {
        vec2 refractionUVOffsetRaw = (vec2(dot(finalPerturbedSurfaceNormal.xy, cross(-viewDir, vec3(0.0, 0.0, -1.0)).xy), dot(finalPerturbedSurfaceNormal.xy, -viewDir.xy)) + ((blueNoiseOffset * 0.002) * g_flWaterFogStrength)).xy * min(g_flRefractionLimit, finalWaterColumnDepthForRefract);

        float depthBufferRange = g_flViewportMaxZ - g_flViewportMinZ;
        float surfaceDepth = -(g_matWorldToView * vec4(finalSurfacePos, 1.0)).z;
        float normalizedDepth = clamp((textureLod(g_tSceneDepth, gbufferUV + refractionUVOffsetRaw.xy, 0.0).x - g_flViewportMinZ) / depthBufferRange, 0.0, 1.0);
        normalizedDepth = max(normalizedDepth, 0.0000001);

        float groundDepth = (1.0 / fma(1.0, normalizedDepth, 0.0 /*PsToVs, which we don't need because inverse Z, TODO: simplify this?*/));
        float waterExtent = groundDepth - surfaceDepth;
        float refractionOffsetAttenuation = clamp(fma(max(waterExtent, 0.0), 0.01, refractionDistortionFactor) * 10.0, 0.0, 1.0);


        vec2 finalRefractionUVOffset = refractionUVOffsetRaw * refractionOffsetAttenuation;

        float finalRefractedNormalizedDepth = (texture(g_tSceneDepth, gbufferUV + finalRefractionUVOffset).x - g_flViewportMinZ) / depthBufferRange;
        finalRefractedNormalizedDepth = max(finalRefractedNormalizedDepth, 0.0000001);


        //vec4 finalRefractedColor = texture(g_tSceneColor, clamp(gbufferUV + finalRefractionUVOffset, vec2(0.0), vec2(1.0)));

        #if F_BLUR_REFRACTION == 1
            float smallOffset = 0.001 * max(waterExtent, 0.0) * 0.01;
            vec4 sample1 = texture(g_tSceneColor, clamp(gbufferUV + (finalRefractionUVOffset * (1.0 + g_flRefractSampleOffset * max(waterExtent, 0.0) * 0.01 * 0.0)) + vec2(0.0, smallOffset), vec2(0.0), vec2(1.0)));
            vec4 sample2 = texture(g_tSceneColor, clamp(gbufferUV + (finalRefractionUVOffset * (1.0 + g_flRefractSampleOffset * max(waterExtent, 0.0) * 0.01 * 1.0)), vec2(0.0), vec2(1.0)));
            vec4 sample3 = texture(g_tSceneColor, clamp(gbufferUV + (finalRefractionUVOffset * (1.0 + g_flRefractSampleOffset * max(waterExtent, 0.0) * 0.01 * 2.0)) - vec2(0.0, smallOffset), vec2(0.0), vec2(1.0)));
            vec4 sample4 = texture(g_tSceneColor, clamp(gbufferUV + (finalRefractionUVOffset * (1.0 + g_flRefractSampleOffset * max(waterExtent, 0.0) * 0.01 * 3.0)) + vec2(smallOffset, 0.0), vec2(0.0), vec2(1.0)));
            vec4 sample5 = texture(g_tSceneColor, clamp(gbufferUV + (finalRefractionUVOffset * (1.0 + g_flRefractSampleOffset * max(waterExtent, 0.0) * 0.01 * 4.0)) - vec2(smallOffset, 0.0), vec2(0.0), vec2(1.0)));


            // 4. Mix the color channels from different samples to create the aberration
            // This is a direct translation of the fma chain in the original shader
            vec4 mixedColor =
            (sample5 * mix(vec4(1.0), vec4(2.0, 0.0, 0.0, 1.0), g_flRefractChromaticSeparation)) +
            (sample4 * mix(vec4(1.0), vec4(2.0, 2.0, 0.0, 1.0), g_flRefractChromaticSeparation)) +
            (sample3 * mix(vec4(1.0), vec4(0.0, 3.0, 0.0, 1.0), g_flRefractChromaticSeparation)) +
            (sample2 * mix(vec4(1.0), vec4(1.0, 0.0, 2.0, 1.0), g_flRefractChromaticSeparation)) +
            (sample1 * mix(vec4(1.0), vec4(0.0, 0.0, 3.0, 1.0), g_flRefractChromaticSeparation));

            vec4 finalRefractedColor = mixedColor * 0.2; // Average the 5 samples
        #else
            vec4 finalRefractedColor = texture(g_tSceneColor, clamp(gbufferUV + finalRefractionUVOffset, vec2(0.0), vec2(1.0)));
        #endif // F_BLUR_REFRACTION == 1
        //finalRefractedColor = texture(g_tSceneColor, clamp(gbufferUV + finalRefractionUVOffset, vec2(0.0), vec2(1.0)));

        vec3 darkenedRefractedColor = pow(finalRefractedColor.rgb, vec3(1.1)) * g_flUnderwaterDarkening;

        inscatterStrength += siltFromEffects * 2.0;

        float causticVisibility = clamp((GetLuma(darkenedRefractedColor.xyz) - g_flCausticShadowCutOff) * (2.0 + g_flCausticShadowCutOff), 0.0, 1.0);

        //VALIDATE: inscatterStrength and causticVisibility. Make sure they match original!
        combinedRefractedColor = darkenedRefractedColor;
        vec3 modifiedCausticsRefractColor = darkenedRefractedColor;

        if(causticVisibility > 0.0)
        {
            vec3 g_vCameraUpDirWs = normalize(inverse(mat3(g_matWorldToView))[1]);
            vec3 refractedViewDir = (-normalize((-viewDir + ((g_vCameraUpDirWs * finalRefractionUVOffset.y) * 2.0)) + ((cross(g_vCameraDirWs, g_vCameraUpDirWs) * (-finalRefractionUVOffset.x)) * 2.0))).xyz;
            float perspectiveCorrection = dot(g_vCameraDirWs, refractedViewDir);
            float sceneViewDistance = (1.f / (sceneNormalizedDepth * perspectiveCorrection));
            vec3 refractedSceneHitPosWs = g_vCameraPositionWs + normalize(refractedViewDir) * sceneViewDistance;

            //TODO:  = _Globals_.g_bUseTriplanarCaustics != 0;
            bool useTriplanarCaustics = false;

            vec3 causticsLightDir = sunDir;

            if(useTriplanarCaustics)
            {
                vec3 reconstructedWorldSurfaceNormalExtent = abs(reconstructedWorldSurfaceNormal);
                causticsLightDir = mix(sunDir, mix(mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), vec3(reconstructedWorldSurfaceNormalExtent.y < reconstructedWorldSurfaceNormalExtent.x)), vec3(0.0, 0.0, 1.0), bvec3(reconstructedWorldSurfaceNormalExtent.z > max(reconstructedWorldSurfaceNormalExtent.x, reconstructedWorldSurfaceNormalExtent.y))), vec3(0.65));                                      
            }

            
            
            float causticsDepth = worldPosForFoamAndDebrisBase.z - refractedSceneHitPosWs.z;

            //approximates where we would be on the surface
            vec3 causticSurfaceHit =  mix(refractedSceneHitPosWs + ((causticsLightDir.xyz * causticsLightDir.z) * causticsDepth), finalSurfacePos.xyz, vec3(clamp((pow(blueNoise.x, 2.0) * inscatterStrength) * 0.0125, 0.0, 1.0)));

            float distToCausticSurfaceHit = distance(causticSurfaceHit, refractedSceneHitPosWs);

            vec2 causticDebrisUV = causticSurfaceHit.xy / g_flDebrisScale;
            vec4 causticDebrisSample = texture(g_tDebris, mix(causticDebrisUV, (((causticDebrisUV + (debrisWobbleOffset * finalDebrisVisibility)) + ((viewParallaxFactor * noClue) * 0.1)) + ((foamWobbleAnim * 0.1) * 0.04)) - dominantFoamSiltNorm, depthFactorSmall).xy, causticsDepth * 0.05);
            

            float causticDebrisCoverage = clamp((fma(-finalDebrisVisibility, 0.9, causticDebrisSample.w) - debrisEdgeFactor) * 1.1, 0.0, 1.0);
            
            
            #if F_CAUSTICS == 1
            float causticDepthFalloffPre = distToCausticSurfaceHit / g_flCausticDepthFallOffDistance;
            float causticDepthFalloff = clamp(1.0 - causticDepthFalloffPre, 0.0, 1.0);
            float causticBaseIntensity = (causticVisibility * clamp(distToCausticSurfaceHit * 0.05, 0.0, 1.0)) * causticDepthFalloff;

            if (!useTriplanarCaustics)
            {
                causticBaseIntensity *= clamp(dot(reconstructedWorldSurfaceNormal, causticsLightDir.xyz), 0.0, 1.0);
            }
            
            

            vec2 causticWaveUVBase = (causticSurfaceHit.xy * vec2(1.0 / 30)) * g_flCausticUVScaleMultiple;

            vec2 currWaveScale = g_vWaveScale.xy;
            vec2 currWaveUvOffset = vec2(0);
            float currWaveDir = g_flWaterInitialDirection;

            for(int i = 0; i < 3; i++)
            {
                vec2 localUV =
                fma(    vec2(sin(currWaveDir), cos(currWaveDir)) * ((g_flTime * g_flWavesSpeed) * 0.5),
                        sqrt(vec2(1.0) / currWaveScale),
                        (causticWaveUVBase.xy + currWaveUvOffset) / currWaveScale).xy;

                float lodOffset = fma(-g_flCausticSharpness, causticDepthFalloff, 1.0) * 6.0;

                vec3 rawSample = texture(g_tWavesNormalHeight, localUV, lodOffset).xyz;
                
                currWaveUvOffset.xy += (((((rawSample - vec3(0.5)).xy * 0.5) * g_flCausticDistortion) * (vec2(1.0) + currWaveScale)) * (0.25 + causticDepthFalloffPre));

                currWaveScale *= g_flWavesPhaseOffset;
                currWaveDir += (3.5 / (i + 1));
            }

            

            vec2 currWaveScale1 = g_vWaveScale.xy;
            float currWaveDir1 = g_flWaterInitialDirection;
            vec3 currWaveSampleSum1 = vec3(0.0);
            

            for(int i = 0; i < 3; i++)
            {
                float causticIterProgress = float(i) / (float(g_nWaveIterations) - 1.0);

                vec2 uv = fma(

                vec2(sin(currWaveDir1), cos(currWaveDir1)) * ((g_flTime * g_flWavesSpeed) * 0.5),

                sqrt(vec2(1.0) / currWaveScale1),

                (causticWaveUVBase.xy + currWaveUvOffset) / currWaveScale1).xy;


                float lodOffset = fma(-g_flCausticSharpness, causticDepthFalloff, 1.0) * 6.0;

                vec3 rawSample = vec3(texture(g_tWavesNormalHeight, uv, lodOffset).z);
                vec3 exponent = vec3(causticDepthFalloff * g_flCausticSharpness * 5.0);

                float factor = clamp(mix(mix(fma(debrisDisturbanceForWaves, 0.1, g_flLowFreqWeight), g_flMedFreqWeight + debrisDisturbanceForWaves, clamp(causticIterProgress * 2.0, 0.0, 1.0)), fma(g_flHighFreqWeight, currentWaterRoughness, debrisDisturbanceForWaves), clamp(fma(causticIterProgress, 2.0, -1.0), 0.0, 1.0)), 0.1, 0.4);

                
                float waveSampleCausticDepthFalloff = causticDepthFalloff * g_flCausticSharpness;
                currWaveSampleSum1 += (((((pow(rawSample, exponent) * factor) * (vec3(1.0) + (currWaveSampleSum1 * 2.0))) * causticDepthFalloff) * waveSampleCausticDepthFalloff) * 2.0);


                currWaveScale1 *= g_flWavesPhaseOffset;
                currWaveDir += (3.5 / (i + 1));
            }
            

            vec3 subPart = (causticSurfaceHit.xyz + ((vec3(currWaveUvOffset, 0.0) * 60.0) * currWaveSampleSum1.x));
            subPart -= g_vCameraPositionWs * 1.0;
            vec4 causticsClipPos = g_matWorldToProjection * vec4(subPart, 1.0);

            vec2 causticsNdc = causticsClipPos.xy / causticsClipPos.w;

            //TODO: should the y be flipped here? should depend on texture convention, no? Or not because both texture and NDC are flipped? Investigate when doing effects!
            vec2 causticsUV = vec2(causticsNdc.x, -causticsNdc.y) * 0.5 - 0.5;

            vec4 causticsEffectsSampleRaw = vec4(vec3(0.5), 0.0) - 0.5; //texture(g_tWaterEffectsMap, causticsUV) - 0.5;

            vec4 finalCausticsEffectsSample = causticsEffectsSampleRaw;
            finalCausticsEffectsSample.yz = clamp(causticsEffectsSampleRaw.yz * 2.0, 0.0, 1.0);
            

            vec4 fadedCausticsEffects = finalCausticsEffectsSample * clamp((((causticsUV.y * (1.0 - causticsUV.y)) * causticsUV.x) * (1.0 - causticsUV.x)) * 40.0, 0.0, 1.0);
            float causticsEffectFoamOverChangerate = fadedCausticsEffects.x + (fadedCausticsEffects.x / fma(fwidth(fadedCausticsEffects.x), 1000.0, 0.5));
            vec3 causticsModifier = (currWaveSampleSum1 + vec3(fma(clamp(causticsEffectFoamOverChangerate, 0.0, 1.0) * 4.0, g_flWaterEffectCausticStrength, -((clamp(-causticsEffectFoamOverChangerate, 0.0, 1.0) * 0.15) * g_flWaterEffectCausticStrength)))) * mix(1.0, 0.0, clamp(fma(causticDebrisCoverage, 2.0, fadedCausticsEffects.y * 0.4), 0.0, 1.0));
            
            vec3 powA = max(causticsModifier * (vec3(1.0) + (vec3(1.25, -0.25, -1.0) * (clamp(dFdxFine(causticsModifier.x) * 200.0, -1.0, 1.0) * clamp(fma(-causticsModifier.x, 3.0, 1.0), 0.0, 1.0)))), vec3(0.001)) * 8.0;
            modifiedCausticsRefractColor *= (vec3(1.0) + (((((pow(powA, vec3(2.5)) * causticBaseIntensity) * sunColor) * g_vCausticsTint.xyz) * g_flCausticsStrength) * 0.1));
            

            causticsEffectsZ = fadedCausticsEffects.z;
            #endif //F_CAUSTICS == 1

            float softenedModifiedCausticsRefractLuminance = pow(GetLuma(modifiedCausticsRefractColor), 0.2);
            
            //TODO: what do we name this?
            float _14717 = clamp(dFdxFine(softenedModifiedCausticsRefractLuminance), -1.0, 1.0) + clamp(-dFdyFine(softenedModifiedCausticsRefractLuminance), -1.0, 1.0);
            causticsDebrisTotal.w = causticDebrisCoverage;
            combinedRefractedColor = mix(modifiedCausticsRefractColor, modifiedCausticsRefractColor * (vec3(1.0) + (vec3(2.5, 0.0, -2.0) * float(int(sign(_14717 * clamp(abs(_14717) - 0.1, 0.0, 1.0)))))), vec3(clamp(200.0 / distanceToFrag, 0.0, 1.0) * 0.1));
        }
        
        postRefractionWaterColumnDepth = fma(max( ( 1.0 / finalRefractedNormalizedDepth) - surfaceDepth, 0.0), 0.01, refractionDistortionFactor);
    }

    
    float effectiveWaterDepthForFog = min(g_flWaterMaxDepth, postRefractionWaterColumnDepth);
    vec3 waterDecayColorFactor = exp(((g_vWaterDecayColor.rgb - vec3(1.0)) * vec3(g_flWaterDecayStrength)) * effectiveWaterDepthForFog);
    float totalFogStrength = max(inscatterStrength, causticsEffectsZ);
    float foamDebrisForFogMix = finalFoamIntensity + clamp(causticsEffectsZ - 0.5, 0.0, 1.0);
    float waterFogAlpha = fma(fma(-clamp(blueNoise.x, 0.0, 1.0), 0.25, foamDebrisForFogMix), 0.1, 1.0 - exp((-effectiveWaterDepthForFog) * totalFogStrength));
    vec3 baseFogColor = mix(g_vWaterFogColor.rgb, finalFoamColor, vec3(foamDebrisForFogMix * 0.1)) * mix(waterDecayColorFactor, vec3(1.0), vec3(clamp(totalFogStrength * 0.04, 0.0, 1.0)));
    vec3 finalDirToCam = -normalize(finalSurfacePos.xyz - g_vCameraPositionWs.xyz);
    float specularCosAlpha = clamp(dot(-sunDir, reflect(finalDirToCam, normalize(mix(normalize(geometricNormal).xyz, finalPerturbedSurfaceNormal.xyz, vec3(g_flSpecularNormalMultiple * fma(distanceToFrag, 0.0005, 1.0)))))), 0.0, 1.0);
    float specularExponent = mix(g_flSpecularPower, g_flDebrisReflectance * 8.0, debrisEdgeFactor) * mix(2.0, 0.2, clamp(currentWaterRoughness, 0.0, 1.0));
    float specularFactor = fma(pow(specularCosAlpha, specularExponent), 0.1, pow(specularCosAlpha, specularExponent * 10.0));
    float inverseWaterFogAlpha = 1.0 - waterFogAlpha;
    float waterOpacity = (clamp((1.0 - debrisEdgeFactor) + noClue, 0.0, 1.0) * clamp(fma(-combinedSurfaceCoverage, 4.0, 1.0), 0.0, 1.0)) * inverseWaterFogAlpha;
    float squaredWaterOpacity = pow(waterOpacity, 2.0);
    
    //TODO: this would ask for worldPos + "precision lighting offset" instead of just worldPos, whatever the fuck that is
    float underwaterDistortionScale = mix(1.0, effectiveWaterDepthForFog * 2.0, 0.75);
    vec3 lightingSamplePos = worldPos.xyz + (((-viewDepOffsetFactor) * (vec3(finalSurfaceHeight * (-1.0)) + (((mix(blueNoise.xxx, vec3(blueNoise.xy, 0.0), vec3(0.1)) * 90.0) * squaredWaterOpacity) + vec3(g_flWaterPlaneOffset)))) * underwaterDistortionScale);


    vec3 ditheredLightmapUV = vec3(vLightmapUVScaled.xy + (((((((fwidth(vLightmapUVScaled.xy) * 1200.0) / vec2(distanceToFrag)) * cosNormAngle) * (-viewParallaxFactor)) * vec2(-1.0, 1.0)) * (vec2(finalSurfaceHeight * (-2.0)) + ((mix(blueNoise.yy, blueNoise.yx, vec2(0.1)) * 20.0) * squaredWaterOpacity))) * underwaterDistortionScale), 0.0).xyz;
    

    //Calculating baked lighting
    //TODO: helper function to obtain lightmap directly from lightmapUVs? the function usually responsible for getting lightmap samples could use that too for reduced code duplication.
    //TODO: should baked shadow and irrad be 1? I guess so?
    #if (D_BAKED_LIGHTING_FROM_LIGHTMAP == 1)
    vec3 lightmapShadowSample = texture(g_tDirectLightShadows, ditheredLightmapUV).rgb;
    vec3 bakedIrradiance = texture(g_tIrradiance, ditheredLightmapUV).rgb;

    if(true)
    {
        #if (S_LIGHTMAP_VERSION_MINOR >= 3)
        vec4 vAHDData = texture(g_tDirectionalIrradianceR, ditheredLightmapUV);
        #else
        vec4 vAHDData = texture(g_tDirectionalIrradiance, ditheredLightmapUV);
        #endif

        bakedIrradiance = ComputeLightmapShading(bakedIrradiance, vAHDData, finalSurfaceNormal);
    }
    #else
    vec3 lightmapShadowSample = vec3(1.0);
    vec3 bakedIrradiance = vec3(1.0);
    #endif
    
    //TODO: see if ambientTerm actually matches bakedIrradiance for all practical intents and purposes! Wait, is this sunlighting? therefore the dot? I am so confused

    float shadowTerm = CalculateSunShadowMapVisibility(lightingSamplePos);// = 1.0;

    vec3 ambientTerm = bakedIrradiance; //vec3(dot(undetermined._m0._m0[0].xyzw, surfaceNormal4f), dot(undetermined._m0._m0[1].xyzw, surfaceNormal4f), dot(undetermined._m0._m0[2].xyzw, surfaceNormal4f));

    //vec4 surfaceNormal4f = vec4(finalSurfaceNormal, 1.0);

    // ----- DETERMINES CORRECT SHADOW CASCADE(S) TO SAMPLE FROM AND SAMPLES
    {
    /*int NumOfCascades = 3;
    
    if(NumOfCascades != 0)
    {
        vec4 lightSamplePos4f = vec4(finalSurfacePos.xyz, 1.0);
        int finalCascadeIndex = -1;
        float shadowCascadeLerpFactor = 1.0;
        vec3 shadowSpaceFragCoord = vec3(0.0);
        int i = 0;

        for (int i = 0; i < NumOfCascades; i++)
        {
            vec4 lightSpaceCoord = lightSamplePos4f * transpose(g_mWorldToShadowCascade[i])

            if (max(abs(lightSpaceCoord.x), abs(lightSpaceCoord.y)) < g_vShadowCascadeSampleThreshold[i])
            {
                shadowSpaceFragCoord = vec3(lightSpaceCoord.xyz);
                vec2 lerpXYComponents = vec2(1.0) - clamp(fma(abs(shadowSpaceFragCoord.xy), vec2(g_flShadowCascadeSplitLerpFactorScale), vec2(g_flShadowCascadeSplitLerpFactorOffset)), vec2(0.0), vec2(1.0));
                shadowSpaceFragCoord.xy = fma(shadowSpaceFragCoord.xy, g_vShadowCascadeAtlasOffset[i].zw, g_vShadowCascadeAtlasOffset[i].xy);
                shadowCascadeLerpFactor = clamp(lerpXYComponents.x * lerpXYComponents.y, 0.0, 1.0);
                finalCascadeIndex = i;
                break;
            }
        }
        float finalCsmCoverage = 1.0;
        if (finalCascadeIndex >= 0)
        {
            float shadowCoverage = textureLod(sampler2DShadow(g_tShadowDepthBufferDepth,s_ShadowSamplerComparison), vec3(shadowSpaceFragCoord.xy, clamp(shadowSpaceFragCoord.z + g_flShadowCascadeReceiverDepthBias, 0.0, 1.0)), 0.0);
            if (shadowCascadeLerpFactor < 1.0)
            {
                float secondCascadeShadowCoverage;
                if (finalCascadeIndex < (undetermined._m7 - 1))
                {
                    int secondCascadeIndex = finalCascadeIndex + 1;
                    vec4 secondCascadeShadowSpaceFragCoord = lightSamplePos4f * mat4(vec4(undetermined._m14._m0[secondCascadeIndex]._m0[0].x, undetermined._m14._m0[secondCascadeIndex]._m0[1].x, undetermined._m14._m0[secondCascadeIndex]._m0[2].x, undetermined._m14._m0[secondCascadeIndex]._m0[3].x), vec4(undetermined._m14._m0[secondCascadeIndex]._m0[0].y, undetermined._m14._m0[secondCascadeIndex]._m0[1].y, undetermined._m14._m0[secondCascadeIndex]._m0[2].y, undetermined._m14._m0[secondCascadeIndex]._m0[3].y), vec4(undetermined._m14._m0[secondCascadeIndex]._m0[0].z, undetermined._m14._m0[secondCascadeIndex]._m0[1].z, undetermined._m14._m0[secondCascadeIndex]._m0[2].z, undetermined._m14._m0[secondCascadeIndex]._m0[3].z), vec4(undetermined._m14._m0[secondCascadeIndex]._m0[0].w, undetermined._m14._m0[secondCascadeIndex]._m0[1].w, undetermined._m14._m0[secondCascadeIndex]._m0[2].w, undetermined._m14._m0[secondCascadeIndex]._m0[3].w));
                    secondCascadeShadowSpaceFragCoord.xy = fma(secondCascadeShadowSpaceFragCoord.xy, undetermined._m15._m0[secondCascadeIndex].zw, undetermined._m15._m0[secondCascadeIndex].xy);
                    secondCascadeShadowCoverage = textureLod(g_tShadowDepthBufferDepth, vec3(secondCascadeShadowSpaceFragCoord.xy, clamp(secondCascadeShadowSpaceFragCoord.z + g_flShadowCascadeReceiverDepthBias, 0.0, 1.0)), 0.0);
                }
                else
                {
                    secondCascadeShadowCoverage = 1.0;
                }
                finalCsmCoverage = mix(secondCascadeShadowCoverage, shadowCoverage, shadowCascadeLerpFactor);
            }
            elsehttps://bsky.app/profile/stefan-s-from-h.de/post/3ly4qqqk6kk2v
            {
                finalCsmCoverage = shadowCoverage;
            }
        }
        float finalFadedCsmCoverage = mix(finalCsmCoverage, 1.0, clamp(fma(distance(trueWorldPos, PerViewConstantBuffer_t.g_vCameraPositionWs), g_flShadowCascadeZLerpFactorScale, g_flShadowCascadeZLerpFactorOffset), 0.0, 1.0));
        shadowTerm = finalFadedCsmCoverage;

        if (notEqual(PerViewConstantBufferCsgo_t.g_bOtherFxEnabled, ivec4(0)).y)
        {
            shadowTerm = min(finalFadedCsmCoverage, textureLod(sampler2D(g_tParticleShadowBuffer, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), (FragCoordWInverse.xy * PerViewConstantBuffer_t.g_vInvGBufferSize.xy).xy, 0.0).z);
        }
        
    }*/
    }

    vec4 g_vToolsAmbientLighting = vec4(0); // actually seems to be zero ingame on ancient, tools mode only?

    float lightmapShadowMulti = 1.0 - dot(lightmapShadowSample, vec3(1.0, 0, 0));

    float finalShadowingEffect = mix(shadowTerm * lightmapShadowMulti, lightmapShadowMulti, waterOpacity * 0.5);

    vec3 lightingFactor = g_vToolsAmbientLighting.xyz;


    if ((dot(sunDir, finalSurfaceNormal.xyz) * finalShadowingEffect) > 0.0)
    {
        lightingFactor = fma(vec3(max(0.0, dot(finalSurfaceNormal.xyz, sunDir))).xyz, (sunColor * finalShadowingEffect).xyz, g_vToolsAmbientLighting.xyz);
    }
    
    {
    //----- LIGHT CULLING AND LIGHTING (not entirely understood by me, I didn't want to spend time on things we aren't doing rn)
    /*
    if (PerViewConstantBufferCsgo_t.g_bOtherEnabled2.x)
    {
        //vec4 _24261 = vec4(trueWorldPos, 1.0).xyzw * mat4(vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].x), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].y), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].z), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].w));
        vec4 _24261 = vec4(trueWorldPos, 1.0).xyzw * transpose(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0);
        vec2 ndcXY = _24261.xy / _24261.w;
        vec4 _6654;
        _6654.x = clamp(((ndcXY.x + 1.0) * PerViewConstantBuffer_t.g_vViewportSize.x) * 0.5, 0.0, PerViewConstantBuffer_t.g_vViewportSize.x - 1.0);
        _6654.y = clamp(((1.0 - ndcXY.y) * PerViewConstantBuffer_t.g_vViewportSize.y) * 0.5, 0.0, PerViewConstantBuffer_t.g_vViewportSize.y - 1.0);
        _6654.w = _20181;
        pixelCoordInvW = _6654;
    }

    uvec2 _12083 = uvec2(pixelCoordInvW.xy - PerViewConstantBuffer_t.g_vViewportOffset.xy) >> uvec2(g_vTileCullParams.x);
    uint _10838 = g_vLightCullParams.y + (((_12083.y * g_vTileCullParams.y) + _12083.x) * g_vLightCullParams.z);
    uint _23393 = g_vLightCullParams.x + (uint(clamp(pixelCoordInvW.w * undetermined._m6.x, 0.0, undetermined._m6.y)) * g_vLightCullParams.z);
    vec3 _13155;
    _13155 = lightingFactor;
    uint _7172;
    vec3 _13156;
    uint _16208 = 0u;
    for (;;)
    {
        if (!(_16208 < g_vLightCullParams.z))
        {
            break;
        }
        uint _13365 = subgroupOr(g_CullBits_1._m0[_10838 + _16208] & g_CullBits_1._m0[_23393 + _16208]);
        uint _24597 = _16208 * 32u;
        _7172 = _16208 + 1u;
        _13156 = _13155;
        uint _20344;
        vec3 _12504;
        uint _16209 = _13365;
        for (;;)
        {
            if (!(_16209 != 0u))
            {
                break;
            }
            int _11281 = int(uint(findLSB(_16209)) + _24597);
            _20344 = _16209 & (_16209 - 1u);
            do
            {
                vec3 _14644 = lightingSamplePos.xyz;
                vec4 _15817 = mat4(vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].x, g_BarnLights_1._m0[_11281]._m0._m0[1].x, g_BarnLights_1._m0[_11281]._m0._m0[2].x, g_BarnLights_1._m0[_11281]._m0._m0[3].x), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].y, g_BarnLights_1._m0[_11281]._m0._m0[1].y, g_BarnLights_1._m0[_11281]._m0._m0[2].y, g_BarnLights_1._m0[_11281]._m0._m0[3].y), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].z, g_BarnLights_1._m0[_11281]._m0._m0[1].z, g_BarnLights_1._m0[_11281]._m0._m0[2].z, g_BarnLights_1._m0[_11281]._m0._m0[3].z), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].w, g_BarnLights_1._m0[_11281]._m0._m0[1].w, g_BarnLights_1._m0[_11281]._m0._m0[2].w, g_BarnLights_1._m0[_11281]._m0._m0[3].w)) * vec4(lightingSamplePos.xyz, 1.0);
                vec3 _10521 = _15817.xyz / vec3(_15817.w);
                vec4 _22905;
                _22905.x = _10521.x;
                _22905.y = _10521.y;
                _22905.z = _10521.z;
                vec3 _21543 = _22905.xyz;
                vec3 _21662;
                if ((g_BarnLights_1._m0[_11281]._m14 & 4u) != 0u)
                {
                    vec2 _6281 = _22905.yx * vec2(1.0, -1.0);
                    vec3 _23716 = _21543;
                    _23716.x = _6281.x;
                    _23716.y = _6281.y;
                    _21662 = _23716;
                }
                else
                {
                    _21662 = _21543;
                }
                bool _7424;
                if (all(greaterThan(_21662.xyz, vec3(-1.0, -1.0, 0.0))))
                {
                    _7424 = all(lessThan(_21662.xyz, vec3(1.0)));
                }
                else
                {
                    _7424 = false;
                }
                bool _12886;
                if (!_7424)
                {
                    _12886 = true;
                }
                else
                {
                    _12886 = !all(lessThanEqual(abs((mat4x3(vec3(g_BarnLights_1._m0[_11281]._m15._m0[0].x, g_BarnLights_1._m0[_11281]._m15._m0[1].x, g_BarnLights_1._m0[_11281]._m15._m0[2].x), vec3(g_BarnLights_1._m0[_11281]._m15._m0[0].y, g_BarnLights_1._m0[_11281]._m15._m0[1].y, g_BarnLights_1._m0[_11281]._m15._m0[2].y), vec3(g_BarnLights_1._m0[_11281]._m15._m0[0].z, g_BarnLights_1._m0[_11281]._m15._m0[1].z, g_BarnLights_1._m0[_11281]._m15._m0[2].z), vec3(g_BarnLights_1._m0[_11281]._m15._m0[0].w, g_BarnLights_1._m0[_11281]._m15._m0[1].w, g_BarnLights_1._m0[_11281]._m15._m0[2].w)) * vec4(_14644, 1.0)).xyz), vec3(1.0)));
                }
                if (_12886)
                {
                    _12504 = _13156;
                    break;
                }
                float _12415 = g_BarnLights_1._m0[_11281]._m5.z * (-2.0);
                float _21996 = 2.0 * g_BarnLights_1._m0[_11281]._m5.x;
                float _15157 = 2.0 * g_BarnLights_1._m0[_11281]._m5.w;
                float _19536 = _15157 * g_BarnLights_1._m0[_11281]._m5.z;
                vec3 _16268 = vec3(fma(_21996, g_BarnLights_1._m0[_11281]._m5.y, -_19536), fma(_12415, g_BarnLights_1._m0[_11281]._m5.z, fma(g_BarnLights_1._m0[_11281]._m5.x * (-2.0), g_BarnLights_1._m0[_11281]._m5.x, 1.0)), fma(2.0 * g_BarnLights_1._m0[_11281]._m5.y, g_BarnLights_1._m0[_11281]._m5.z, _15157 * g_BarnLights_1._m0[_11281]._m5.x)) * g_BarnLights_1._m0[_11281]._m6.z;
                float _21316;
                if (g_BarnLights_1._m0[_11281]._m3.z > 0.0)
                {
                    _21316 = min(1.0, _21662.z * g_BarnLights_1._m0[_11281]._m3.z);
                }
                else
                {
                    _21316 = 1.0;
                }
                float _19667;
                if (g_BarnLights_1._m0[_11281]._m3.w > 0.0)
                {
                    _19667 = _21316 * min(1.0, (1.0 - _21662.z) * g_BarnLights_1._m0[_11281]._m3.w);
                }
                else
                {
                    _19667 = _21316;
                }
                vec3 _11179;
                float _11937;
                if (g_BarnLights_1._m0[_11281]._m2.w != 0.0)
                {
                    vec3 _10017 = g_BarnLights_1._m0[_11281]._m2.xyz - _14644;
                    float _18345 = dot(_10017, _10017);
                    float _17647 = sqrt(_18345);
                    vec3 _12302 = _10017 - _16268;
                    vec3 _10210;
                    do
                    {
                        vec3 _20229 = (_10017 + _16268) - _12302;
                        float _25105 = dot(-_12302, _20229);
                        if (_25105 <= 0.0)
                        {
                            _10210 = _12302;
                            break;
                        }
                        else
                        {
                            _10210 = _12302 + (_20229 * min(1.0, _25105 / dot(_20229, _20229)));
                            break;
                        }
                        break; // unreachable workaround
                    } while(false);
                    _11179 = _10017 / vec3(_17647);
                    _11937 = ((_19667 * (g_BarnLights_1._m0[_11281]._m2.w / max(_18345, g_BarnLights_1._m0[_11281]._m2.w))) * clamp(fma(g_BarnLights_1._m0[_11281]._m3.y, _17647, g_BarnLights_1._m0[_11281]._m3.x), 0.0, 1.0)) * clamp(fma(g_BarnLights_1._m0[_11281]._m6.y, dot(vec3(fma(_12415, g_BarnLights_1._m0[_11281]._m5.z, fma(g_BarnLights_1._m0[_11281]._m5.y * (-2.0), g_BarnLights_1._m0[_11281]._m5.y, 1.0)), fma(_21996, g_BarnLights_1._m0[_11281]._m5.y, _19536), fma(_21996, g_BarnLights_1._m0[_11281]._m5.z, -(_15157 * g_BarnLights_1._m0[_11281]._m5.y))), normalize(_10210)), g_BarnLights_1._m0[_11281]._m6.x), 0.0, 1.0);
                }
                else
                {
                    _11179 = g_BarnLights_1._m0[_11281]._m2.xyz;
                    _11937 = _19667;
                }
                vec3 _15440 = (g_BarnLights_1._m0[_11281]._m4.xyz * 1.0).xyz * _11937;
                bool _24419;
                if (g_BarnLights_1._m0[_11281]._m8.z > 0.0)
                {
                    _24419 = !_20060;
                }
                else
                {
                    _24419 = false;
                }
                vec3 _21548;
                if (g_BarnLights_1._m0[_11281]._m4.w == 0.0)
                {
                    float _10342;
                    do
                    {
                        vec2 _22154 = abs(_21662.xy);
                        if (g_BarnLights_1._m0[_11281]._m9.z == 0.0)
                        {
                            _10342 = smoothstep(1.0, g_BarnLights_1._m0[_11281]._m9.x, _22154.x) * smoothstep(1.0, g_BarnLights_1._m0[_11281]._m9.y, _22154.y);
                            break;
                        }
                        else
                        {
                            float _11473 = _22154.x;
                            float _15266 = 2.0 / g_BarnLights_1._m0[_11281]._m9.z;
                            float _15017 = _22154.y;
                            float _23041 = (-0.5) * g_BarnLights_1._m0[_11281]._m9.z;
                            float _11981 = (g_BarnLights_1._m0[_11281]._m9.x * g_BarnLights_1._m0[_11281]._m9.y) * pow(max(pow(g_BarnLights_1._m0[_11281]._m9.y * _11473, _15266) + pow(g_BarnLights_1._m0[_11281]._m9.x * _15017, _15266), 1.1754943508222875079687365372222e-38), _23041);
                            float _16524 = pow(max(pow(_11473, _15266) + pow(_15017, _15266), 1.1754943508222875079687365372222e-38), _23041);
                            if (_11981 < _16524)
                            {
                                _10342 = smoothstep(_16524, _11981, 1.0);
                                break;
                            }
                            else
                            {
                                _10342 = float(_16524 > 1.0);
                                break;
                            }
                            break; // unreachable workaround
                        }
                        break; // unreachable workaround
                    } while(false);
                    _21548 = _15440.xyz * _10342;
                }
                else
                {
                    vec3 _12503;
                    if (g_BarnLights_1._m0[_11281]._m4.w < 0.0)
                    {
                        vec4 _17795 = vec4(-g_BarnLights_1._m0[_11281]._m5.xyz, g_BarnLights_1._m0[_11281]._m5.w);
                        vec4 _19008 = _17795.xyzw * vec4(-1.0, -1.0, -1.0, 1.0);
                        vec3 _24989 = _19008.xyz;
                        vec3 _23629 = vec4((-_11179).xyz, 0.0).xyz;
                        float _15156 = -dot(_23629, _24989);
                        vec3 _20479 = vec4((_23629 * _19008.w) + cross(_23629, _24989), _15156).xyz;
                        vec3 _23592 = _17795.xyz;
                        vec3 _12170 = ((_20479 * g_BarnLights_1._m0[_11281]._m5.w) + (_23592 * _15156)) + cross(_23592, _20479);
                        vec3 _14385 = vec3(vec2(atan(_12170.y, -_12170.x) * 0.15915493667125701904296875, acos(_12170.z) * 0.3183098733425140380859375), -g_BarnLights_1._m0[_11281]._m4.w);
                        vec2 _13665 = fma(_14385.xy, g_BarnLights_1._m0[_11281]._m9.zw, g_BarnLights_1._m0[_11281]._m9.xy);
                        vec3 _19313 = _14385;
                        _19313.x = _13665.x;
                        _19313.y = _13665.y;
                        _12503 = _15440.xyz * textureLod(sampler3D(g_tLightCookieTexture, Filter_21_AddressU_0_AddressV_0_AllowGlobalMipBiasOverride_0), _19313.xyz, 0.0).xyz;
                    }
                    else
                    {
                        vec3 _14095 = vec3(fma(_22905.xy, vec2(0.5, -0.5), vec2(0.5)), g_BarnLights_1._m0[_11281]._m4.w);
                        vec2 _13664 = fma(_14095.xy, g_BarnLights_1._m0[_11281]._m9.zw, g_BarnLights_1._m0[_11281]._m9.xy);
                        vec3 _19312 = _14095;
                        _19312.x = _13664.x;
                        _19312.y = _13664.y;
                        _12503 = _15440.xyz * textureLod(sampler3D(g_tLightCookieTexture, Filter_20_AddressU_3_AddressV_3_AddressW_3_BorderColor_0), _19312.xyz, 0.0).xyz;
                    }
                    _21548 = _12503;
                }
                if (all(equal(_21548.xyz, vec3(0.0))))
                {
                    _12504 = _13156;
                    break;
                }
                vec3 _19629;
                if (_24419)
                {
                    vec3 _20482 = _21548.xyz * mix(1.0, textureLod(sampler2DShadow(g_tShadowDepthBufferDepth, AddressU_2_AddressV_2_Filter_149_ComparisonFunc_3), vec3(vec3(fma(_21662.xy, g_BarnLights_1._m0[_11281]._m8.zw, g_BarnLights_1._m0[_11281]._m8.xy), _21662.z).xy, clamp(_21662.z + undetermined._m8, 0.0, 1.0)), 0.0), g_BarnLights_1._m0[_11281]._m12);
                    if (all(equal(_20482.xyz, vec3(0.0))))
                    {
                        _12504 = _13156;
                        break;
                    }
                    _19629 = _20482;
                }
                else
                {
                    _19629 = _21548;
                }
                _12504 = fma(vec3(max(0.0, dot(finalSurfaceNormal.xyz, _11179.xyz))).xyz, _19629.xyz, _13156.xyz);
                break;
            } while(false);
            _13156 = _12504;
            _16209 = _20344;
            continue;
        }
        _13155 = _13156;
        _16208 = _7172;
        continue;
    }*/
    }
    //TODO: find something comparable to g_vFastPathSunLightlightmapShadowSampleMask

    vec3 _22686 = (lightingFactor.xyz + bakedIrradiance) * mix(mix((baseFogColor * waterFogAlpha) * g_flWaterFogShadowStrength, finalFoamColor.xyz, vec3(combinedSurfaceCoverage)), vec4(debrisColorHeightSample.xyz * fma(finalDebrisFactor, 0.5, 0.5), debrisEdgeFactor).xyz * g_vDebrisTint.xyz, vec3(clamp(debrisEdgeFactor - noClue, 0.0, 1.0))).xyz;
    
    //outputColor.rgb = debrisColorHeightSample.xyz;
    //return;

    #if F_REFRACTION == 0
      combinedRefractedColor = vec3(0);
    #endif

    vec3 returnColor = mix(_22686, combinedRefractedColor * waterDecayColorFactor, vec3(waterOpacity));
    returnColor = mix(returnColor, (baseFogColor * 4.0) * bakedIrradiance, vec3((waterFogAlpha * clamp((1.0 - surfaceCoverageAlpha) + noClue, 0.0, 1.0)) * (1.0 - g_flWaterFogShadowStrength)));
    //---CHECKED AND CONFIRMED UP TO HERE!!!!!!

    float roughnessForCubemap = dot(mix(g_vRoughness,vec2(1),vec2(clamp(reflectionsLodFactor, 0.0 ,0.35))), vec2(0.5) );

    vec3 tempSurfNormal = finalPerturbedSurfaceNormal;
    tempSurfNormal = finalSurfaceNormal;

    if(true)
    {
    tempSurfNormal.xy *= 6.0;
    tempSurfNormal = mat3(g_matWorldToView) * normalize(tempSurfNormal);
    tempSurfNormal.yz *= 2;
    tempSurfNormal = transpose(mat3(g_matWorldToView)) * normalize(tempSurfNormal);
    }
    else
    {
        tempSurfNormal.xy *= 6.0;
    }
    
    
    float reflectionBlendFactor = clamp(fma(-roughnessForCubemap, roughnessForCubemap, 1.0), 0.0, 1.0);


    //material.AmbientNormal = tempSurfNormal;
    //material.Curvature = 0;

    vec3 reflectedRay = reflect(viewDir, tempSurfNormal);

    vec3 reflectedNormalDone = normalize(mix(tempSurfNormal, reflectedRay, vec3(reflectionBlendFactor * fma(roughnessForCubemap, roughnessForCubemap, sqrt(reflectionBlendFactor)))));

    #if F_REFLECTION_TYPE > 0
        vec3 cubemapReflection = GetEnvMapByPosDirRoughness(vFragPosition, reflectedNormalDone, sqrt(roughnessForCubemap)); // * g_flEnvironmentMapBrightness; //  * g_flLowEndCubeMapIntensity
    #else
        vec3 cubemapReflection = SrgbGammaToLinear(g_vSimpleSkyReflectionColor.rgb);
    #endif


    outputColor.rgb = vec3(cubemapReflection);
    //return;

    bool has_hit = false;
    //TODO: get the correct parameters, this is just a hack for now
    //cubemapReflection = texture(g_tLowEndCubeMap, reflect(viewDir, finalSurfaceNormal)).rgb * g_flLowEndCubeMapIntensity * GetLuma(ambientTerm);

    //cubemapReflection

    vec3 finalReflectionColor = cubemapReflection;



    float SSRStepCountMultiplier = clamp((cameraDirWs.z + 0.75) * 4.0, 0.0, 1.0) * (0.5 + 0.5 * float(!isSkybox));

    int SSRStepCount = int(g_nSSRMaxForwardSteps * SSRStepCountMultiplier);

    #if F_REFLECTION_TYPE == 0 || F_REFLECTION_TYPE == 1
    SSRStepCount = 0;
    #endif

    outputColor.rgb = vec3(1.0 / sceneNormalizedDepth - 1.0 / ((gl_FragCoord.z - 0.05) / 0.95));  //- 1.0 / ((gl_FragDepth - 0.05) / 0.95)
    //return;


    vec2 SsrUV;

    if(SSRStepCount > 0)
    {
        //outputColor.rgb = vec3(10.0, 0.0, 0.0);
        //return;
        float SsrHitThickness = fma(blueNoiseDitherFactor, g_flSSRSampleJitter, g_flSSRMaxThickness);

        mat4 transWorldToView = transpose(g_matWorldToView);
        mat4 transViewToProj = transpose(g_matViewToProjection);
        vec4 SSNormal4f = g_matWorldToView * vec4(normalize(vec3((finalSurfaceNormal.xy * 3.0) * mix(2.0, 8.0, float(isSkybox)), finalSurfaceNormal.z)), 0.0);

        vec3 viewSpacePos = (g_matWorldToView * vec4(finalSurfacePos.xyz, 1.0)).xyz;

        vec3 SSNormal = SSNormal4f.xyz;
        SSNormal.yz *= 2;
        
        vec4 _15818 = g_matViewToProjection * vec4(-viewSpacePos.xyz, 1.0); //transViewToProj * vec4(-viewSpacePos, 1.0);

        vec3 baseNdcCoords = _15818.xyz / vec3(_15818.w);

        vec2 baseSsrUV = baseNdcCoords.xy * 0.5 + 0.5;
        outputColor.rgb = vec3(baseSsrUV, 0.0);


        float initialStepSize = (fma(blueNoiseDitherFactor, g_flSSRSampleJitter, g_flSSRStepSize) / fma(reflectionsLodFactor, 2.0, 1.0)) * mix(20.0, 1.0, cosNormAngle);


        float baseStepSize = initialStepSize;
        if (isSkybox)
        {
            baseStepSize = initialStepSize * (distanceToFrag * 0.002);
        }

        vec3 SSReflectDir = normalize(reflect(normalize(viewSpacePos), normalize(SSNormal))).xyz;


        outputColor.rgb = -finalSurfacePos.zzz + vFragPosition.zzz - 1;
        //return;

        vec3 prevSamplePos = viewSpacePos;
        vec2 SsrUVCoords = baseSsrUV;
        vec2 finalSsrUVCoords;
        float currStepSize;
        float currSampleWorldDepth;
        float prevWorldDepth = 0.0;
        vec3 currSamplePos;
        float prevStepSize = baseStepSize;
        float fractionalSampleCount;
        float finalPrevCurrFrac = 0.0;
        float prevPrevCurrFrac = 0.0;
        float prevCurrFrac;
        int i = 1;
        for(;i <= SSRStepCount; i++)
        {
            currStepSize = prevStepSize * 1.15;
            currSamplePos = prevSamplePos + SSReflectDir * currStepSize;
            vec4 currViewSpacePos = g_matViewToProjection * vec4(-currSamplePos, 1.0);
            vec3 _10510 = currViewSpacePos.xyz / vec3(currViewSpacePos.w);
            vec2 currSsrUV = (vec2(_10510.x, _10510.y) * 0.5) + vec2(0.5);
            vec4 _20493;
            float currNormalizedDepth = (textureLod(g_tSceneDepth, currSsrUV.xy, 0.0).x - g_flViewportMinZ) / (g_flViewportMaxZ - g_flViewportMinZ);

            currNormalizedDepth = max(currNormalizedDepth, 0.0000001);

            currSampleWorldDepth = (-1.0 / currNormalizedDepth - currSamplePos.z);

            //outputColor.rgb = vec3(currSampleWorldDepth - 20);
            //return;

            prevCurrFrac = clamp(currSampleWorldDepth / (currSampleWorldDepth - prevWorldDepth), 0.0, 1.0);

            bool hasHit = false;
            if (currSampleWorldDepth >= 0.0)
            {

                if(currSampleWorldDepth < (SsrHitThickness * currStepSize) )
                {
                    fractionalSampleCount = prevCurrFrac;
                    finalSsrUVCoords = mix(currSsrUV, SsrUVCoords, vec2(prevCurrFrac));

                    
                    break;
                }
            }
            SsrUVCoords = currSsrUV;

            prevWorldDepth = currSampleWorldDepth;
            prevSamplePos = currSamplePos;
            prevStepSize = currStepSize;
        }
        float fracOfTotalSteps = (float(i) - fractionalSampleCount) / float(SSRStepCount);
        vec3 SsrReflectionResult;

        outputColor.rgb = vec3(10.0, 0.0, 0.0);
        //return;

        if (!isSkybox)
        {
            vec2 scaledSsrUVs = finalSsrUVCoords; // * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy
            float _8505 = fracOfTotalSteps * (-0.00390625);
            vec3 SsrColorSample = ((
            (texture(g_tSceneColor, clamp(scaledSsrUVs + vec2(_8505), vec2(0.0), vec2(1.0)).xy).xyz * 0.444444) +
            (texture(g_tSceneColor, clamp(scaledSsrUVs + vec2(0.001953125, _8505), vec2(0.0), vec2(1.0)).xy).xyz * 0.222222)) +
            (texture(g_tSceneColor, clamp(scaledSsrUVs + vec2(_8505, 0.001953125), vec2(0.0), vec2(1.0)).xy).xyz * 0.222222)) +
            (texture(g_tSceneColor, clamp(scaledSsrUVs + vec2(0.001953125), vec2(0.0), vec2(1.0)).xy).xyz * 0.111111);

            SsrReflectionResult = (SsrColorSample + ((normalize(SsrColorSample + vec3(0.001)) * max(0.0, GetLuma(SsrColorSample.xyz) - g_flSSRBoostThreshold)) * g_flSSRBoost)) * g_flSSRBrightness;
        }
        else
        {
            SsrReflectionResult = mix((returnColor.xyz + cubemapReflection) * 0.5, cubemapReflection, vec3(fracOfTotalSteps));
        }
        finalReflectionColor = mix(cubemapReflection, SsrReflectionResult, vec3(clamp(1.0 - pow(fracOfTotalSteps, 4.0), 0.0, 1.0) * clamp((1.0 - finalSsrUVCoords.y) * 8, 0.0, 1.0) ));
    }
    float localReflectance = mix(g_flReflectance, g_flDebrisReflectance, finalDebrisFactor);
    float reflectionModulation = (fma(fresnel, 1.0 - localReflectance, localReflectance) * fma(-combinedSurfaceCoverage, 2.0, fma(-surfaceCoverageAlpha, 0.75, 1.0))) * 1.5;
    returnColor = fma((lightingFactor.xyz * (fma(max(0.0, specularFactor - (1.0 - g_flSpecularBloomBoostThreshold)), g_flSpecularBloomBoostStrength, specularFactor) * mix(1.0, g_flDebrisReflectance * 0.05, debrisEdgeFactor))) * reflectionModulation, sunColor, returnColor.xyz);

    //TODO: Figure out what is going on here. This is straight up copied from decompile

    float _8302 = fract(fma(g_flTime, 0.1, fma(fresnel, 20.0, debrisHeightVal * 8.0)));

    float _15999 = floor(_8302 * 6.0);
    float _22138 = fract(_8302 * 6.0);

    float _6700 = 0.75 * (1.0 - _22138);
    float _14751 = 0.75 * _22138;
    vec3 _11313;
    if (floor(_8302 * 6.0) == 0.0)
    {
        _11313 = vec3(0.75, _14751, 0.0);
    }
    else
    {
        if (floor(_8302 * 6.0) == 1.0)
        {
            _11313 = vec3(_6700, 0.75, 0.0);
        }
        else
        {
            if (floor(_8302 * 6.0) == 2.0)
            {
                _11313 = vec3(0.0, 0.75, _14751);
            }
            else
            {
                if (floor(_8302 * 6.0) == 3.0)
                {
                    _11313 = vec3(0.0, _6700, 0.75);
                }
                else
                {
                    if (floor(_8302 * 6.0) == 4.0)
                    {
                        _11313 = vec3(_14751, 0.0, 0.75);
                    }
                    else
                    {
                        _11313 = vec3(0.75, 0.0, _6700);
                    }
                }
            }
        }
    }
    returnColor = returnColor.xyz * mix(vec3(1.0), ambientTerm * 0.75, vec3(clamp(causticsDebrisTotal.w * 4.0, 0.0, 1.0) * inverseWaterFogAlpha));


    vec3 returnColorMixFac = vec3(clamp(reflectionModulation, 0.0, 1.0));
    vec3 secondaryColorMixFac = vec3(((clamp(noClue * 20.0, 0.0, 1.0) * g_flDebrisOilyness) / fma(distanceToFrag, 0.005, 1.0)) * clamp(fma(-waterColumnDepthVertical, 5.0, 1.0), 0.0, 1.0));

    returnColor = mix(returnColor, mix(finalReflectionColor, finalReflectionColor * _11313, secondaryColorMixFac), returnColorMixFac);

    
    //return;

//    if (_Globals_.g_bFogEnabled != 0)
//    {
//        vec3 _21493;
//        vec3 _23187 = trueWorldPos - PerViewConstantBuffer_t.g_vCameraPositionWs.xyz;
//        vec3 _9057 = _23187.xyz;
//        vec3 fogAppliedRetColor;
//        do
//        {
//            _21493 = _23187.xyz;
//            bool _12888;
//            if (dot(_21493, _21493) > PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.x)
//            {
//                _12888 = (trueWorldPos.z * PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.z) < PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.y;
//            }
//            else
//            {
//                _12888 = false;
//            }
//            if (_12888)
//            {
//                vec2 _6354 = clamp(fma(PerViewConstantBufferCsgo_t.g_vGradientFogBiasAndScale.zw, vec2(length(_21493), trueWorldPos.z), PerViewConstantBufferCsgo_t.g_vGradientFogBiasAndScale.xy), vec2(0.0), vec2(1.0));
//                float _12872 = (pow(_6354.x, PerViewConstantBufferCsgo_t.m_vGradientFogExponents.x) * pow(_6354.y, PerViewConstantBufferCsgo_t.m_vGradientFogExponents.y)) * PerViewConstantBufferCsgo_t.g_vGradientFogColor_Opacity.w;
//                fogAppliedRetColor = mix(returnColor5.xyz, vec4(PerViewConstantBufferCsgo_t.g_vGradientFogColor_Opacity.xyz, _12872).xyz, vec3(_12872));
//                break;
//            }
//            fogAppliedRetColor = returnColor5.xyz;
//            break;
//        } while(false);
//        vec4 _23944 = returnColor5;
//        _23944.x = fogAppliedRetColor.x;
//        _23944.y = fogAppliedRetColor.y;
//        _23944.z = fogAppliedRetColor.z;
//        vec3 _19341;
//        do
//        {
//            bool _12889;
//            if (dot(_9057, _9057) > PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.x)
//            {
//                _12889 = (PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.z * trueWorldPos.z) < PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.y;
//            }
//            else
//            {
//                _12889 = false;
//            }
//            if (_12889)
//            {
//                float _14602 = clamp(pow(max(0.0, fma(length(_21493), PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.y, PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.x)), PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.w), 0.0, 1.0) * clamp(pow(max(0.0, fma(trueWorldPos.z, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.y, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.x)), PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.z), 0.0, 1.0);
//                float _8892 = clamp(_14602, 0.0, 1.0) * PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.w;
//                _19341 = mix(_23944.xyz, vec4((textureLod(samplerCube(g_tFogCubeTexture, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), normalize((mat4(vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].x), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].y), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].z), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].w)) * vec4(_9057, 0.0)).xyz).xyz, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.w * clamp(fma(-_14602, PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.z, 1.0), 0.0, 1.0)) * PerViewConstantBufferCsgo_t.g_vCubeFog_ExposureBias.x).xyz, _8892).xyz, vec3(_8892));
//                break;
//            }
//            _19341 = _23944.xyz;
//            break;
//        } while(false);
//
//        _23944.x = _19341.x;
//        _23944.y = _19341.y;
//        _23944.z = _19341.z;
//        returnColor6 = _23944;
//    }
//    else
//    {
//        returnColor6 = returnColor5;
//    }

// We replace that fog logic with our own.
    ApplyFog(returnColor, finalSurfacePos);

    // --- DITHER INTO SKYBOX ---
    if (!isSkybox)
    {
        vec2 _3206 = abs(vec2(0.5) - worldSpaceUV) * 2.0;
        if ((clamp(1.0 - clamp((max(_3206.x, _3206.y) - (1.0 - g_flSkyBoxFadeRange)) / g_flSkyBoxFadeRange, 0.0, 1.0), 0.0, 1.0) - blueNoise.x) < 0.0)
        {
            discard;
        }
    }
    // --- PERFORM EDGE BLEND ---
    //outputColor.rgb = returnColor;
    #if F_REFRACTION == 1
    if (!isSkybox)
    {
        returnColor = vec3(mix((sceneColorSample.xyz * mix(1.0, 0.6, clamp(waterColumnDepthVertical * 60.0, 0.0, 1.0) / fma(distanceToFrag, 0.002, 1.0))).xyz, returnColor.xyz, vec3(clamp(fma(g_flEdgeHardness, effectiveWaterDepthForFog, clamp(combinedSurfaceCoverage, 0.0, 1.0)) + fma(debrisHeightVal, 2.0, -0.5), 0.0, 1.0))));
    }
    #endif

    //outputColor.rgb = vec3(clamp(fma(g_flEdgeHardness, effectiveWaterDepthForFog, clamp(combinedSurfaceCoverage, 0.0, 1.0)) + fma(debrisHeightVal, 2.0, -0.5), 0.0, 1.0));
    //return;

    // --- MOIT SOMETHING (for now unused, do we even do MOIT?) ---
//    if (one_minus_e_to_the_zeroth > 0.0)
//    {
//        vec4 _3401 = texelFetch(g_tMoitFinal, scaledFragCoord, 0);
//        vec3 _8598 = _3401.xyz * (one_minus_e_to_the_zeroth / (_3401.w + 9.9999997473787516355514526367188e-06));
//        vec4 _8677;
//        _8677.x = _8598.x;
//        _8677.y = _8598.y;
//        _8677.z = _8598.z;
//        vec3 _24094 = _8677.xyz + (returnColor8.xyz * e_to_the_zerothMoment);
//        vec4 _20494 = returnColor8;
//        _20494.x = _24094.x;
//        _20494.y = _24094.y;
//        _20494.z = _24094.z;
//        returnColor = _20494;
//    }


    outputColor.rgb = returnColor;

}
