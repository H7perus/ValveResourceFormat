// SPIR-V source (81228 bytes), GLSL reflection with SPIRV-Cross by KhronosGroup
// Source 2 Viewer 12.0.0.0 - https://valveresourceformat.github.io

#version 460
#extension GL_EXT_samplerless_texture_functions : require
#if defined(GL_EXT_control_flow_attributes)
#extension GL_EXT_control_flow_attributes : require
#define SPIRV_CROSS_FLATTEN [[flatten]]
#define SPIRV_CROSS_BRANCH [[dont_flatten]]
#define SPIRV_CROSS_UNROLL [[unroll]]
#define SPIRV_CROSS_LOOP [[dont_unroll]]
#else
#define SPIRV_CROSS_FLATTEN
#define SPIRV_CROSS_BRANCH
#define SPIRV_CROSS_UNROLL
#define SPIRV_CROSS_LOOP
#endif
#extension GL_KHR_shader_subgroup_arithmetic : require

struct anon_g_matPrimaryViewWorldToProjection
{
    vec4 _m0[4];
};

struct _97
{
    vec4 _m0[3];
};

struct _308
{
    vec4 _m0[4];
};

struct _98
{
    vec4 _m0[3];
};

struct _2144
{
    anon_g_matPrimaryViewWorldToProjection _m0[4];
};

struct _2096
{
    anon_g_matPrimaryViewWorldToProjection _m0;
    anon_g_matPrimaryViewWorldToProjection _m1;
    vec4 _m2;
    vec4 _m3;
    vec4 _m4;
    vec4 _m5;
    vec3 _m6;
    int _m7;
    vec4 _m8;
    vec4 _m9;
    vec4 _m10;
    float _m11;
    float _m12;
    uint _m13;
    uint _m14;
    _98 _m15;
    vec4 _m16;
    vec4 _m17;
    vec4 _m18;
    vec4 _m19;
    vec4 _m20;
    vec3 _m21;
    float _m22;
};

float _21011;
vec4 _17208;
vec3 _20799;

struct _2643
{
    int g_bFogEnabled;
    int g_bDontFlipBackfaceNormals;
    int g_bRenderBackfaceNormals;
    float g_flWaterPlaneOffset;
    float g_flSkyBoxScale;
    float g_flSkyBoxFadeRange;
    vec2 g_vMapUVMin;
    vec2 g_vMapUVMax;
    float g_flLowEndCubeMapIntensity;
    float g_flWaterRoughnessMin;
    float g_flWaterRoughnessMax;
    float g_flFoamMin;
    float g_flFoamMax;
    float g_flDebrisMin;
    float g_flDebrisMax;
    vec3 g_vDebrisTint;
    float g_flDebrisReflectance;
    float g_flDebrisOilyness;
    float g_flDebrisNormalStrength;
    float g_flDebrisEdgeSharpness;
    float g_flDebrisScale;
    float g_flDebrisWobble;
    float g_flFoamScale;
    float g_flFoamWobble;
    vec4 g_vFoamColor;
    float g_flWavesHeightOffset;
    float g_flWavesSharpness;
    float g_flFresnelExponent;
    float g_flWavesNormalStrength;
    float g_flWavesNormalJitter;
    vec2 g_vWaveScale;
    float g_flWaterInitialDirection;
    float g_flWavesSpeed;
    float g_flLowFreqWeight;
    float g_flMedFreqWeight;
    float g_flHighFreqWeight;
    float g_flWavesPhaseOffset;
    float g_flEdgeHardness;
    float g_flEdgeShapeEffect;
    uint g_nWaveIterations;
    vec3 g_vWaterFogColor;
    float g_flRefractionLimit;
    float g_flWaterFogStrength;
    vec3 g_vWaterDecayColor;
    float g_flWaterDecayStrength;
    float g_flWaterMaxDepth;
    float g_flWaterFogShadowStrength;
    float g_flUnderwaterDarkening;
    float g_flSpecularPower;
    float g_flSpecularNormalMultiple;
    float g_flSpecularBloomBoostStrength;
    float g_flSpecularBloomBoostThreshold;
    int g_bUseTriplanarCaustics;
    float g_flCausticUVScaleMultiple;
    float g_flCausticDistortion;
    float g_flCausticsStrength;
    float g_flCausticSharpness;
    float g_flCausticDepthFallOffDistance;
    float g_flCausticShadowCutOff;
    vec4 g_vCausticsTint;
    vec4 g_vViewportExtentsTs;
    float g_flReflectance;
    float g_flReflectionDistanceEffect;
    float g_flForceMixResolutionScale;
    float g_flEnvironmentMapBrightness;
    vec2 g_vRoughness;
    float g_flSSRStepSize;
    float g_flSSRSampleJitter;
    uint g_nSSRMaxForwardSteps;
    float g_flSSRBoostThreshold;
    float g_flSSRBoost;
    float g_flSSRBrightness;
    float g_flSSRMaxThickness;
    float g_flWaterEffectsRippleStrength;
    float g_flWaterEffectSiltStrength;
    float g_flWaterEffectFoamStrength;
    float g_flWaterEffectDisturbanceStrength;
    float g_flWaterEffectCausticStrength;
};

layout(set = 0) uniform _2643 _Globals_;

struct _2988
{
    ivec4 g_bOtherFxEnabled;
    ivec4 g_bOtherEnabled2;
    ivec4 g_bOtherEnabled3;
    ivec2 g_vBlueNoiseMask;
    anon_g_matPrimaryViewWorldToProjection g_matPrimaryViewWorldToProjection;
    vec4 g_vGradientFogBiasAndScale;
    vec4 m_vGradientFogExponents;
    vec4 g_vGradientFogColor_Opacity;
    vec4 g_vGradientFogCullingParams;
    vec4 g_vCubeFog_Offset_Scale_Bias_Exponent;
    vec4 g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip;
    anon_g_matPrimaryViewWorldToProjection g_matvCubeFogSkyWsToOs;
    vec4 g_vCubeFogCullingParams_MaxOpacity;
    vec4 g_vCubeFog_ExposureBias;
    vec4 g_vHighPrecisionLightingOffsetWs;
};

layout(set = 0) uniform _2988 PerViewConstantBufferCsgo_t;

struct _2824
{
    anon_g_matPrimaryViewWorldToProjection g_matWorldToProjection;
    anon_g_matPrimaryViewWorldToProjection g_matWorldToView;
    anon_g_matPrimaryViewWorldToProjection g_matViewToProjection;
    vec4 g_vInvProjRow3;
    vec3 g_vCameraPositionWs;
    float g_flViewportMinZ;
    vec3 g_vCameraDirWs;
    float g_flViewportMaxZ;
    vec3 g_vCameraUpDirWs;
    float g_flTime;
    vec3 g_vDepthPsToVsConversion;
    vec2 g_vInvViewportSize;
    vec2 g_vViewportToGBufferRatio;
    vec4 g_vInvGBufferSize;
    vec2 g_vViewportOffset;
    vec2 g_vViewportSize;
    vec4 g_vWorldToCameraOffset;
};

layout(set = 0) uniform _2824 PerViewConstantBuffer_t;

struct _2471
{
    _97 _m0;
    vec4 _m1;
    vec4 _m2;
    vec4 _m3;
    uvec4 _m4;
    uvec4 _m5;
    vec4 _m6;
    int _m7;
    float _m8;
    vec4 _m9;
    float _m10;
    float _m11;
    float _m12;
    float _m13;
    _2144 _m14;
    _308 _m15;
};

layout(set = 1) uniform _2471 undetermined;

layout(set = 1, binding = 30, std430) readonly buffer g_CullBits
{
    uint _m0[];
} g_CullBits_1;

layout(set = 1, binding = 31, std430) readonly buffer g_BarnLights
{
    _2096 _m0[];
} g_BarnLights_1;

layout(set = 0, binding = 117) uniform texture2D g_tZerothMoment;
layout(set = 0, binding = 90) uniform texture2D g_tBlueNoise;
layout(set = 0, binding = 116) uniform texture2D g_tSceneDepth;
layout(set = 0, binding = 47) uniform sampler AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2_Filter_0_AddressW_2;
layout(set = 0, binding = 115) uniform texture2D g_tRefractionMap;
layout(set = 0, binding = 46) uniform sampler Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2;
layout(set = 0, binding = 119) uniform texture2D g_tWaterEffectsMap;
layout(set = 0, binding = 113) uniform texture2D g_tFoam;
layout(set = 0, binding = 48) uniform sampler AllowGlobalMipBiasOverride_0_Filter_255_MaxAniso_1_AddressU_dynamic_AddressV_dynamic;
layout(set = 0, binding = 111) uniform texture2D g_tDebris;
layout(set = 0, binding = 56) uniform sampler DefaultSamplerState_0;
layout(set = 0, binding = 112) uniform texture2D g_tDebrisNormal;
layout(set = 0, binding = 51) uniform sampler Filter_20_AddressU_3_AddressV_3_AddressW_3_BorderColor_0;
layout(set = 0, binding = 52) uniform samplerShadow AddressU_2_AddressV_2_Filter_149_ComparisonFunc_3;
layout(set = 0, binding = 96) uniform texture2D g_tShadowDepthBufferDepth;
layout(set = 0, binding = 107) uniform texture2D g_tParticleShadowBuffer;
layout(set = 0, binding = 94) uniform texture3D g_tLightCookieTexture;
layout(set = 0, binding = 45) uniform sampler Filter_21_AddressU_0_AddressV_0_AllowGlobalMipBiasOverride_0;
layout(set = 0, binding = 110) uniform textureCube g_tLowEndCubeMap;
layout(set = 0, binding = 55) uniform sampler DefaultSamplerState_0_1;
layout(set = 0, binding = 102) uniform textureCube g_tFogCubeTexture;
layout(set = 0, binding = 118) uniform texture2D g_tMoitFinal;
layout(set = 0, binding = 114) uniform texture2D g_tWavesNormalHeight;
layout(set = 0, binding = 57) uniform sampler DefaultSamplerState_0_2;

layout(location = 1) in float input_0; //g_flTime
layout(location = 2) in vec4 input_1; // vTexCoord
layout(location = 3) in vec3 input_2; // offset world position
layout(location = 4) in vec3 input_3; // Animated texture coordinates
layout(location = 0) out vec4 output_0; //color output

void main()
{
    vec4 _20848 = gl_FragCoord;
    vec4 _21298 = _20848;
    _21298.w = 1.0 / _20848.w;
    bool _12885;
    if (_Globals_.g_bRenderBackfaceNormals != 0)
    {
        _12885 = !(_Globals_.g_bDontFlipBackfaceNormals != 0);
    }
    else
    {
        _12885 = false;
    }
    vec3 _10251;
    if (_12885)
    {
        _10251 = input_3.xyz * (gl_FrontFacing ? 1.0 : (-1.0));
    }
    else
    {
        _10251 = input_3.xyz;
    }
    vec3 _7715 = input_2 + PerViewConstantBufferCsgo_t.g_vHighPrecisionLightingOffsetWs.xyz;
    ivec2 _11700 = ivec3(ivec2(_20848.xy * _Globals_.g_flForceMixResolutionScale), 0).xy;
    float _21877 = exp(-texelFetch(g_tZerothMoment, _11700, 0).x);
    float _4637 = 1.0 - _21877;
    if (_4637 > 0.99989998340606689453125)
    {
        discard;
    }
    bvec4 _24464 = notEqual(PerViewConstantBufferCsgo_t.g_bOtherEnabled3, ivec4(0));
    bool _20058 = _24464.x;
    float _14000;
    if (_20058)
    {
        _14000 = _Globals_.g_flSkyBoxScale;
    }
    else
    {
        _14000 = 1.0;
    }
    vec4 _19511 = texelFetch(g_tBlueNoise, ivec3(ivec2(_20848.xy) & PerViewConstantBufferCsgo_t.g_vBlueNoiseMask, 0).xy, 0);
    vec2 _21412 = _20848.xy * PerViewConstantBuffer_t.g_vInvGBufferSize.xy;
    vec3 _19475 = _7715.xyz;
    vec3 _3980 = _19475 - PerViewConstantBuffer_t.g_vCameraPositionWs;
    vec3 _25095 = normalize(_3980);
    vec3 _3072 = -_25095;
    float _3558 = length(_3980) * _14000;
    vec2 _10337 = _3072.xy;
    float _20990 = _3072.z;
    vec3 _11306 = mix(vec3(_10337 / vec2(_20990), sqrt(_20990)), vec3(0.0), bvec3(_20058));
    bool _8776 = !_20058;
    float _13136;
    float _13378;
    vec4 _14948;
    float _16305;
    vec3 _17114;
    if (_8776)
    {
        vec2 _15784 = _21412.xy;
        float _21984 = clamp((textureLod(sampler2D(g_tSceneDepth, AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2_Filter_0_AddressW_2), _15784, 0.0).x - PerViewConstantBuffer_t.g_flViewportMinZ) / (PerViewConstantBuffer_t.g_flViewportMaxZ - PerViewConstantBuffer_t.g_flViewportMinZ), 0.0, 1.0);
        vec4 _20991 = texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), _15784);
        float _15734 = clamp(dot(_20991.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)), 0.0, 0.4000000059604644775390625);
        vec3 _12686 = _25095.xyz;
        _13136 = _15734 * (-0.02999999932944774627685546875);
        _16305 = _21984;
        _17114 = (PerViewConstantBuffer_t.g_vCameraPositionWs.xyz + (_12686 * (1.0 / (fma(_21984, PerViewConstantBuffer_t.g_vInvProjRow3.z, PerViewConstantBuffer_t.g_vInvProjRow3.w) * dot(PerViewConstantBuffer_t.g_vCameraDirWs.xyz, _12686))))).xyz;
        _14948 = _20991;
        _13378 = fma(_15734, -0.02999999932944774627685546875, max((-(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.x / fma(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.y, _21984, PerViewConstantBuffer_t.g_vDepthPsToVsConversion.z))) - (-(vec4(_7715.xyz, 1.0).xyzw * mat4(vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].x, PerViewConstantBuffer_t.g_matWorldToView._m0[1].x, PerViewConstantBuffer_t.g_matWorldToView._m0[2].x, PerViewConstantBuffer_t.g_matWorldToView._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].y, PerViewConstantBuffer_t.g_matWorldToView._m0[1].y, PerViewConstantBuffer_t.g_matWorldToView._m0[2].y, PerViewConstantBuffer_t.g_matWorldToView._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].z, PerViewConstantBuffer_t.g_matWorldToView._m0[1].z, PerViewConstantBuffer_t.g_matWorldToView._m0[2].z, PerViewConstantBuffer_t.g_matWorldToView._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].w, PerViewConstantBuffer_t.g_matWorldToView._m0[1].w, PerViewConstantBuffer_t.g_matWorldToView._m0[2].w, PerViewConstantBuffer_t.g_matWorldToView._m0[3].w))).z), 0.0) * 0.00999999977648258209228515625);
    }
    else
    {
        _13136 = 0.0;
        _16305 = 1.0;
        _17114 = vec3(0.0);
        _14948 = vec4(0.0);
        _13378 = 1.0;
    }
    float _9935 = max(0.0, _13378 - 0.0199999995529651641845703125);
    float _5722 = _13378 * _20990;
    vec2 _19865 = (_7715.xy - _Globals_.g_vMapUVMin) / (_Globals_.g_vMapUVMax - _Globals_.g_vMapUVMin);
    _19865.y = 1.0 - _19865.y;
    float _24840;
    if (_20058)
    {
        _24840 = _Globals_.g_flWaterRoughnessMax;
    }
    else
    {
        _24840 = max(0.0, mix(_Globals_.g_flWaterRoughnessMin, _Globals_.g_flWaterRoughnessMax, input_1.x));
    }
    float _7010 = _20058 ? 0.0 : max(0.0, mix(_Globals_.g_flDebrisMin, _Globals_.g_flDebrisMax, input_1.z));
    float _13154 = _20058 ? 0.0 : max(0.0, mix(_Globals_.g_flFoamMin, _Globals_.g_flFoamMax, input_1.y));
    vec2 _3386 = ((_19475 * _14000) + (_11306 * (0.5 - _Globals_.g_flWaterPlaneOffset))).xy * vec2(0.0333333350718021392822265625);
    vec2 _21434 = dFdx(_3386);
    vec2 _21118 = dFdy(_3386);
    float _4694 = (0.5 * pow(max(dot(_21434, _21434), dot(_21118, _21118)), 0.100000001490116119384765625)) * _Globals_.g_flReflectionDistanceEffect;
    vec4 _10684 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), (((_20848.xy - PerViewConstantBuffer_t.g_vViewportOffset.xy).xy * PerViewConstantBuffer_t.g_vInvViewportSize.xy).xy * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy).xy);
    vec2 _20371 = clamp((_10684 - vec4(0.5)).yz * 2.0, vec2(0.0), vec2(1.0));
    float _22427 = _20371.y;
    vec4 _24505;
    _24505.z = _22427;
    float _18208 = (_20371.x + _22427) * _Globals_.g_flWaterEffectDisturbanceStrength;
    float _7242 = _18208 * 0.25;
    float _13712 = clamp(_4694, 0.0, 0.5);
    vec3 _5599 = _17114 + (_11306 * clamp(dot(_14948.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)), 0.0, 0.4000000059604644775390625));
    vec3 _16139 = dFdx(_5599);
    vec3 _13627 = dFdy(_5599);
    vec3 _13042 = -normalize(cross(_16139, _13627));
    vec2 _14467 = _19511.xy - vec2(0.5);
    float _4520 = fma(input_0, 3.0, sin(input_0 * 0.5) * 0.100000001490116119384765625);
    vec2 _22402 = vec2(clamp(_9935 * 10.0, 0.0, 1.0));
    float _24418 = _19511.x;
    vec2 _21174 = ((-_10337) / vec2(_20990 + 0.25)).xy;
    vec2 _7093 = vec2(clamp(_9935 * 4.0, 0.0, 1.0));
    float _22737 = fwidth(_16305);
    vec2 _13694 = _21412.xy;
    float _23099 = (_24418 - 0.5) * 2.0;
    vec2 _22593 = _13042.xy + (_14467 * 0.0500000007450580596923828125);
    vec2 _13137;
    vec2 _16306;
    vec3 _17116;
    float _17117;
    vec2 _17133;
    _13137 = vec2(0.0);
    _16306 = _Globals_.g_vWaveScale;
    _17116 = vec3(0.0, 0.0, 1.0);
    _17117 = 0.0;
    _17133 = vec2(0.0);
    float _4987;
    vec2 _5398;
    vec2 _6759;
    float _7708;
    uint _8069;
    vec3 _8417;
    vec2 _15142;
    uint _19857;
    uint _17017 = 0u;
    float _17115 = _Globals_.g_flWaterInitialDirection;
    for (;;)
    {
        _19857 = _Globals_.g_nWaveIterations;
        if (!(_17017 < _19857))
        {
            break;
        }
        float _3843 = float(_17017) / (float(_19857) - 1.0);
        float _10450 = mix(mix(fma(_18208, 0.0500000007450580596923828125, _Globals_.g_flLowFreqWeight), fma(_18208, 0.25, _Globals_.g_flMedFreqWeight), clamp(_3843 * 2.0, 0.0, 1.0)), fma(_Globals_.g_flHighFreqWeight, _24840, _7242), clamp(fma(_3843, 2.0, -1.0), 0.0, 1.0));
        vec3 _19401 = texture(sampler2D(g_tWavesNormalHeight, DefaultSamplerState_0_2), fma(vec2(sin(_17115), cos(_17115)) * ((input_0 * _Globals_.g_flWavesSpeed) * 0.5), sqrt(vec2(1.0) / _16306), ((_3386.xy + (_13137 * 3.0)) + _17133) / _16306).xy, (-1.0) * _13712).xyz - vec3(0.5);
        float _13995 = (_19401.z * _10450) * length(_16306);
        vec2 _9388 = _19401.xy * 2.0;
        vec2 _21276 = vec2(_9388.x * min(1.0, _16306.y / _16306.x), _9388.y * min(1.0, _16306.x / _16306.y)).xy * (_10450 * 0.100000001490116119384765625);
        _6759 = _13137.xy + ((((-_21174) * (_13995 * 0.00999999977648258209228515625)) * _Globals_.g_flWavesHeightOffset) * _24840);
        _15142 = _17133.xy + (((_21276.xy * _Globals_.g_flWavesSharpness) * _16306) * _Globals_.g_flWavesPhaseOffset);
        _7708 = fma(_13995, 0.00999999977648258209228515625, _17117);
        vec2 _16155 = _17116.xy + _21276;
        vec3 _20488;
        _20488.x = _16155.x;
        _8417 = _20488;
        _8417.y = _16155.y;
        _5398 = _16306 * _Globals_.g_flWavesPhaseOffset;
        _8069 = _17017 + 1u;
        _4987 = _17115 + (3.5 / float(_8069));
        _13137 = _6759;
        _16306 = _5398;
        _17115 = _4987;
        _17116 = _8417;
        _17117 = _7708;
        _17133 = _15142;
        _17017 = _8069;
        continue;
    }
    vec2 _9431 = mix(vec2(0.0), _17133, vec2(0.100000001490116119384765625));
    vec3 _20576 = _17116 * _24840;
    vec3 _11008;
    float _13456;
    if (_8776)
    {
        vec3 _23714 = _13042;
        _23714.x = _22593.x;
        _23714.y = _22593.y;
        _11008 = _23714;
        _13456 = _Globals_.g_flEdgeShapeEffect * clamp(fma(-_13042.z, 1.0 - clamp(_5722 * 8.0, 0.0, 1.0), 1.2000000476837158203125), 0.0, 1.0);
    }
    else
    {
        _11008 = vec3(0.0, 0.0, 1.0);
        _13456 = _Globals_.g_flEdgeShapeEffect;
    }
    float _11974 = (_17117 * _24840) * 60.0;
    float _13038;
    float _13138;
    vec2 _14986;
    vec2 _16307;
    float _17120;
    float _17121;
    vec4 _17122;
    vec2 _17123;
    vec3 _17124;
    if (_8776)
    {
        vec3 _21979 = (_19475 + (_11306 * (mix(0.0, _11974, _13456) - _Globals_.g_flWaterPlaneOffset))) + (vec3(_20576.xy, 0.0) * (-16.0));
        vec4 _21447 = PerViewConstantBuffer_t.g_vWorldToCameraOffset * 1.0;
        mat4 _15572 = mat4(vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].w));
        vec4 _24259 = (vec4(_21979.xyz, 1.0) + _21447).xyzw * _15572;
        vec2 _10502 = _24259.xy / vec2(_24259.w);
        vec4 _7435 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), (((vec2(_10502.x, -_10502.y) * 0.5) + vec2(0.5)).xy * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy).xy) - vec4(0.5);
        vec3 _5680 = _21979 + (_11306 * fma(20.0, _7435.x, 2.0 * clamp(_7435.yz * 2.0, vec2(0.0), vec2(1.0)).x));
        vec4 _9193 = (vec4(_5680.xyz, 1.0) + _21447).xyzw * _15572;
        vec2 _10503 = _9193.xy / vec2(_9193.w);
        vec2 _17505 = ((vec2(_10503.x, -_10503.y) * 0.5) + vec2(0.5)).xy;
        vec2 _4929 = _17505 * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy;
        vec4 _7436 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), _4929.xy) - vec4(0.5);
        vec2 _20373 = clamp(_7436.yz * 2.0, vec2(0.0), vec2(1.0));
        float _19557 = _20373.x;
        float _22428 = _20373.y;
        vec4 _24771;
        _24771.z = _22428;
        vec4 _9194 = (vec4((_5680 + vec3(1.0, 0.0, 0.0)).xyz, 1.0) + _21447).xyzw * _15572;
        vec2 _10504 = _9194.xy / vec2(_9194.w);
        vec2 _7013 = -_4929;
        vec2 _3484 = fma((vec2(_10504.x, -_10504.y) * 0.5) + vec2(0.5), PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy, _7013);
        vec4 _9195 = (vec4((_5680 + vec3(0.0, -1.0, 0.0)).xyz, 1.0) + _21447).xyzw * _15572;
        vec2 _10506 = _9195.xy / vec2(_9195.w);
        vec2 _5909 = fma((vec2(_10506.x, -_10506.y) * 0.5) + vec2(0.5), PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy, _7013);
        vec2 _6014 = vec2(0.00039999998989515006542205810546875) / vec2(length(_3484), length(_5909));
        vec4 _7437 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), fma(_17505, PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy, normalize(_3484) * 0.004999999888241291046142578125).xy) - vec4(0.5);
        vec2 _20374 = clamp(_7437.yz * 2.0, vec2(0.0), vec2(1.0));
        vec4 _7438 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), fma(_17505, PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy, normalize(_5909) * 0.004999999888241291046142578125).xy) - vec4(0.5);
        vec2 _20375 = clamp(_7438.yz * 2.0, vec2(0.0), vec2(1.0));
        float _22272 = _6014.x;
        float _23185 = _7436.x;
        float _18860 = _6014.y;
        vec2 _4508 = ((normalize(cross(vec3(_22272, 0.0, _23185 - _7437.x), vec3(0.0, _18860, _23185 - _7438.x))).xy * vec2(-1.0, 1.0)) * (abs(_23185) * 4.0)) * _Globals_.g_flWaterEffectsRippleStrength;
        float _15705 = fma(_23185 * _Globals_.g_flWaterEffectsRippleStrength, 12.0, _11974);
        _13138 = _22428 * _Globals_.g_flWaterEffectSiltStrength;
        _16307 = normalize(cross(vec3(_22272, 0.0, _19557 - _20374.x), vec3(0.0, _18860, _19557 - _20375.x))).xy * vec2(-1.0, 1.0);
        _17120 = _19557 * _Globals_.g_flWaterEffectFoamStrength;
        _17121 = ((_19557 + _22428) * _Globals_.g_flWaterEffectDisturbanceStrength) * 0.25;
        _17122 = _24771;
        _17123 = (normalize(cross(vec3(_22272, 0.0, _22428 - _20374.y), vec3(0.0, _18860, _22428 - _20375.y))).xy * vec2(-1.0, 1.0)) * pow(_22428, 3.5);
        _17124 = (_19475 + (_11306 * (mix(0.5, _15705, _13456) - _Globals_.g_flWaterPlaneOffset))) + (vec3(_4508.xy, 0.0) * (-4.0));
        _14986 = _4508;
        _13038 = _15705;
    }
    else
    {
        _13138 = 0.0;
        _16307 = vec2(0.0);
        _17120 = 0.0;
        _17121 = _7242;
        _17122 = _24505;
        _17123 = vec2(0.0);
        _17124 = _7715.xyz + (_11306 * (mix(0.5, _11974, _13456) - _Globals_.g_flWaterPlaneOffset));
        _14986 = vec2(0.0);
        _13038 = _11974;
    }
    vec3 _15100 = vec3(_14986.xy, 0.0);
    vec3 _3271 = (_19475 + (_11306 * (mix(0.5, _13038, _13456 * 0.5) - _Globals_.g_flWaterPlaneOffset))) + (_15100 * (-2.0));
    vec2 _3085 = vec2(sin(fma(_17124.y, 0.070000000298023223876953125, _4520)), cos(fma(_17124.x, 0.070000000298023223876953125, _4520)));
    vec2 _14993 = _3271.xy;
    vec2 _18043 = vec2(_Globals_.g_flFoamScale);
    vec2 _3790 = _14993 / _18043;
    vec2 _4842 = (_3790 + (((_9431 * _Globals_.g_flFoamWobble) * 0.5) * (1.0 - _13154))) - (_17123 / _18043);
    float _9037 = 0.0500000007450580596923828125 + _17122.z;
    vec4 _19813 = texture(sampler2D(g_tFoam, AllowGlobalMipBiasOverride_0_Filter_255_MaxAniso_1_AddressU_dynamic_AddressV_dynamic), mix(_3790, _4842 + ((_3085 * _9037) * 0.02999999932944774627685546875), _22402).xy);
    vec4 _22273 = texture(sampler2D(g_tFoam, AllowGlobalMipBiasOverride_0_Filter_255_MaxAniso_1_AddressU_dynamic_AddressV_dynamic), mix(_3790.yx * 0.731000006198883056640625, (_4842.yx * 0.731000006198883056640625) + ((vec2(sin(fma(_17124.y, 0.0599999986588954925537109375, _4520)), cos(fma(_17124.x, 0.0599999986588954925537109375, _4520))) * _9037) * 0.0199999995529651641845703125), _22402).xy);
    float _21881 = _22273.z;
    float _13782 = _19813.z;
    float _4812 = fma(sin(_24418), 0.125, max(_13782, _21881));
    float _23301 = clamp(fma(_13154 * fma(_13038, 0.008000000379979610443115234375, 1.0), 1.0 - clamp(_17121 * 2.0, 0.0, 1.0), _17120), 0.0, 1.0);
    float _6870 = pow(_17122.z, 1.5);
    vec2 _15807 = vec2(_Globals_.g_flDebrisScale);
    vec2 _3839 = _14993 / _15807;
    vec2 _10177 = _9431 * _Globals_.g_flDebrisWobble;
    float _6924 = abs(_17123.x);
    float _15937 = _17123.y * float(abs(_17123.y) > _6924);
    vec2 _8534 = (vec2(_17123.x * float(_6924 > abs(_15937)), _15937) / _15807) * 400.0;
    vec2 _20588 = mix(_3839, (((_3839 + (_10177 * (1.0 - _7010))) + ((_21174 * (fma(sin(_17122.z * 50.0) * 4.0, clamp(0.100000001490116119384765625 - _6870, 0.0, 1.0), 1.0) * _6870)) * 0.100000001490116119384765625)) + ((_3085 * (0.100000001490116119384765625 + _17122.z)) * 0.0199999995529651641845703125)) - _8534, _7093).xy;
    vec4 _18109 = texture(sampler2D(g_tDebris, DefaultSamplerState_0), _20588, _6870 * 3.0);
    float _15684 = _18109.w - 0.5;
    float _9184 = fma(-_7010, clamp(1.39999997615814208984375 - (_17122.z / mix(1.0, 0.4000000059604644775390625, _18109.w)), 0.0, 1.0), 1.0);
    float _23667 = clamp((_18109.w - _9184) * _Globals_.g_flDebrisEdgeSharpness, 0.0, 1.0);
    float _10350 = max(0.0, fma(2.0, _6870, _15684 * (-2.0)));
    float _25205 = clamp(fma(-_10350, 10.0, 1.0), 0.0, 1.0);
    float _4500 = _25205 * _23667;
    vec3 _19287 = texture(sampler2D(g_tDebrisNormal, AllowGlobalMipBiasOverride_0_Filter_255_MaxAniso_1_AddressU_dynamic_AddressV_dynamic), _20588).xyz - vec3(0.5);
    _19287.y = -_19287.y;
    vec2 _9380 = _19287.xy * _Globals_.g_flDebrisNormalStrength;
    vec3 _8673;
    _8673.x = _9380.x;
    _8673.y = _9380.y;
    float _24720 = clamp(fma(-_25205, _23667, fma(_23301 * _4812, 0.25, clamp(_23301 - (1.0 - _4812), 0.0, 1.0) * 0.75)), 0.0, 1.0);
    float _10644 = mix(_13038, fma(_13038, 0.5, _15684 * 2.0), _4500);
    vec3 _10932;
    float _12918;
    if (_8776)
    {
        vec3 _13370 = (_19475 + (_11306 * (mix(0.5, _10644, _13456) - _Globals_.g_flWaterPlaneOffset))) + (_15100 * (-12.0));
        _10932 = _13370;
        _12918 = fma(max((-(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.x / fma(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.y, _16305, PerViewConstantBuffer_t.g_vDepthPsToVsConversion.z))) - (-(vec4(_13370.xyz, 1.0).xyzw * mat4(vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].x, PerViewConstantBuffer_t.g_matWorldToView._m0[1].x, PerViewConstantBuffer_t.g_matWorldToView._m0[2].x, PerViewConstantBuffer_t.g_matWorldToView._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].y, PerViewConstantBuffer_t.g_matWorldToView._m0[1].y, PerViewConstantBuffer_t.g_matWorldToView._m0[2].y, PerViewConstantBuffer_t.g_matWorldToView._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].z, PerViewConstantBuffer_t.g_matWorldToView._m0[1].z, PerViewConstantBuffer_t.g_matWorldToView._m0[2].z, PerViewConstantBuffer_t.g_matWorldToView._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].w, PerViewConstantBuffer_t.g_matWorldToView._m0[1].w, PerViewConstantBuffer_t.g_matWorldToView._m0[2].w, PerViewConstantBuffer_t.g_matWorldToView._m0[3].w))).z), 0.0), 0.00999999977648258209228515625, _13136);
    }
    else
    {
        _10932 = _17124;
        _12918 = _13378;
    }
    float _11381 = clamp(_23667 + _24720, 0.0, 1.0);
    vec2 _21778 = (((_20576.xy * 2.0) * _Globals_.g_flWavesNormalStrength) * mix(1.0, 2.0, _4694)) * 1.0;
    vec3 _8674;
    _8674.x = _21778.x;
    _8674.y = _21778.y;
    vec2 _15328 = _8674.xy * fma(clamp(0.20000000298023223876953125 - _12918, 0.0, 1.0), 8.0, 1.0);
    vec3 _8675;
    _8675.x = _15328.x;
    _8675.y = _15328.y;
    vec2 _13842 = _8675.xy + ((_8673.xy * _4500) * 1.5);
    vec3 _13831;
    _13831.x = _13842.x;
    _13831.y = _13842.y;
    vec2 _24093 = _13831.xy + (mix(_19813.xy - vec2(0.5), _22273.xy - vec2(0.5), vec2(float(_21881 > _13782))).xy * _24720);
    vec3 _20489;
    _20489.x = _24093.x;
    _20489.y = _24093.y;
    vec2 _13861 = _20489.xy + ((_16307.xy * _24720) * 0.5);
    vec3 _20490;
    _20490.x = _13861.x;
    _20490.y = _13861.y;
    vec2 _13862 = _20490.xy + ((_14986.xy * (1.0 - clamp(fma(_25205, _23667, _24720), 0.0, 1.0))) * 2.0);
    vec3 _20491;
    _20491.x = _13862.x;
    _20491.y = _13862.y;
    vec2 _22768 = _20491.xy * (vec2(1.0) + ((_14467 * 2.0) * _Globals_.g_flWavesNormalJitter));
    vec3 _23715;
    _23715.x = _22768.x;
    _23715.y = _22768.y;
    vec3 _25156 = vec3(_23715.xy, sqrt(1.0 - clamp(dot(_23715.xy, _23715.xy), 0.0, 1.0)));
    vec2 _8369 = _25156.xy * 3.0;
    vec3 _3653 = vec3(_8369, sqrt(1.0 - clamp(dot(_8369, _8369), 0.0, 1.0)));
    vec3 _9982;
    vec3 _24109;
    if (_8776)
    {
        float _20589 = mix(60.0, 120.0, _11008.z);
        vec3 _15760 = vec3((clamp(fma(-_22737, 1000.0, clamp(((1.0 / _20589) - _12918) * _20589, 0.0, 1.0) + clamp((0.02500000037252902984619140625 - _12918) * 8.0, 0.0, 1.0)), 0.0, 1.0) / fma(_3558, 0.00200000009499490261077880859375, 1.0)) * 0.60000002384185791015625);
        _9982 = normalize(mix(_25156, _11008, _15760));
        _24109 = normalize(mix(_3653, _11008, _15760));
    }
    else
    {
        _9982 = _25156;
        _24109 = _3653;
    }
    float _16004 = clamp(dot(_3072, _24109.xyz), 0.0, 1.0);
    float _6813 = pow(1.0 - _16004, _Globals_.g_flFresnelExponent);
    vec3 _5903 = _Globals_.g_vFoamColor.xyz * fma(_24720, 0.5, 1.0);
    float _6414;
    vec4 _13142;
    float _13618;
    vec3 _16311;
    float _17126;
    if (_8776)
    {
        vec2 _7058 = (vec2(dot(_24109.xy, cross(_3072.xyz, vec3(0.0, 0.0, -1.0)).xy), dot(_24109.xy, _10337)) + ((_14467 * 0.00200000009499490261077880859375) * _Globals_.g_flWaterFogStrength)).xy * min(_Globals_.g_flRefractionLimit, _12918);
        float _10956 = PerViewConstantBuffer_t.g_flViewportMaxZ - PerViewConstantBuffer_t.g_flViewportMinZ;
        float _18935 = -(vec4(_10932.xyz, 1.0).xyzw * mat4(vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].x, PerViewConstantBuffer_t.g_matWorldToView._m0[1].x, PerViewConstantBuffer_t.g_matWorldToView._m0[2].x, PerViewConstantBuffer_t.g_matWorldToView._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].y, PerViewConstantBuffer_t.g_matWorldToView._m0[1].y, PerViewConstantBuffer_t.g_matWorldToView._m0[2].y, PerViewConstantBuffer_t.g_matWorldToView._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].z, PerViewConstantBuffer_t.g_matWorldToView._m0[1].z, PerViewConstantBuffer_t.g_matWorldToView._m0[2].z, PerViewConstantBuffer_t.g_matWorldToView._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].w, PerViewConstantBuffer_t.g_matWorldToView._m0[1].w, PerViewConstantBuffer_t.g_matWorldToView._m0[2].w, PerViewConstantBuffer_t.g_matWorldToView._m0[3].w))).z;
        vec2 _3433 = _7058 * clamp(fma(max((-(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.x / fma(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.y, clamp((textureLod(sampler2D(g_tSceneDepth, AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2_Filter_0_AddressW_2), _13694 + _7058.xy, 0.0).x - PerViewConstantBuffer_t.g_flViewportMinZ) / _10956, 0.0, 1.0), PerViewConstantBuffer_t.g_vDepthPsToVsConversion.z))) - _18935, 0.0), 0.00999999977648258209228515625, _13136) * 10.0, 0.0, 1.0);
        float _11356 = clamp((textureLod(sampler2D(g_tSceneDepth, AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2_Filter_0_AddressW_2), _13694 + _3433.xy, 0.0).x - PerViewConstantBuffer_t.g_flViewportMinZ) / _10956, 0.0, 1.0);
        vec4 _18433 = texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), clamp(_21412.xy + _3433.xy, _Globals_.g_vViewportExtentsTs.xy, _Globals_.g_vViewportExtentsTs.zw).xy);
        vec3 _17565 = pow(_18433.xyz, vec3(1.10000002384185791015625)) * _Globals_.g_flUnderwaterDarkening;
        float _5358 = fma(_13138, 2.0, _Globals_.g_flWaterFogStrength);
        float _9484 = clamp((dot(_17565.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)) - _Globals_.g_flCausticShadowCutOff) * (2.0 + _Globals_.g_flCausticShadowCutOff), 0.0, 1.0);
        vec4 _13141;
        vec3 _16381;
        float _16479;
        if (_9484 > 0.0)
        {
            vec3 _14692 = (-normalize((_3072 + ((PerViewConstantBuffer_t.g_vCameraUpDirWs * _3433.y) * 2.0)) + ((cross(PerViewConstantBuffer_t.g_vCameraDirWs, PerViewConstantBuffer_t.g_vCameraUpDirWs) * (-_3433.x)) * 2.0))).xyz;
            vec3 _24040 = PerViewConstantBuffer_t.g_vCameraPositionWs.xyz + (_14692 * (1.0 / (fma(_11356, PerViewConstantBuffer_t.g_vInvProjRow3.z, PerViewConstantBuffer_t.g_vInvProjRow3.w) * dot(PerViewConstantBuffer_t.g_vCameraDirWs.xyz, _14692))));
            vec3 _10889 = _24040.xyz;
            bool _13251 = _Globals_.g_bUseTriplanarCaustics != 0;
            vec3 _19321;
            if (_13251)
            {
                vec3 _22326 = abs(_11008);
                float _15436 = _22326.y;
                float _17713 = _22326.x;
                _19321 = mix(undetermined._m2.xyz, mix(mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), bvec3(_15436 < _17713)), vec3(0.0, 0.0, 1.0), bvec3(_22326.z > max(_17713, _15436))), vec3(0.64999997615814208984375));
            }
            else
            {
                _19321 = undetermined._m2.xyz;
            }
            float _4382 = _3271.z - _24040.z;
            vec3 _7984 = mix(_10889 + ((_19321.xyz * _19321.z) * _4382), _10932.xyz, vec3(clamp((pow(_24418, 2.0) * _5358) * 0.012500000186264514923095703125, 0.0, 1.0)));
            float _18491 = distance(_7984, _10889);
            vec2 _3358 = _7984.xy / _15807;
            vec4 _14044 = texture(sampler2D(g_tDebris, DefaultSamplerState_0), mix(_3358, (((_3358 + (_10177 * _9184)) + ((_21174 * _10350) * 0.100000001490116119384765625)) + ((_3085 * 0.100000001490116119384765625) * 0.039999999105930328369140625)) - _8534, _7093).xy, _4382 * 0.0500000007450580596923828125);
            float _20466 = clamp((fma(-_9184, 0.89999997615814208984375, _14044.w) - _23667) * 1.10000002384185791015625, 0.0, 1.0);
            vec4 _16121;
            _16121.w = _20466;
            float _21725 = _18491 / _Globals_.g_flCausticDepthFallOffDistance;
            float _20067 = clamp(1.0 - _21725, 0.0, 1.0);
            float _14594 = (_9484 * clamp(_18491 * 0.0500000007450580596923828125, 0.0, 1.0)) * _20067;
            float _9945;
            if (!_13251)
            {
                _9945 = _14594 * clamp(dot(_11008, _19321.xyz), 0.0, 1.0);
            }
            else
            {
                _9945 = _14594;
            }
            vec2 _5614 = (_7984.xy * vec2(0.0333333350718021392822265625)) * _Globals_.g_flCausticUVScaleMultiple;
            vec2 _13139;
            vec2 _17134;
            _13139 = _Globals_.g_vWaveScale;
            _17134 = vec2(0.0);
            uint _7275;
            vec2 _9859;
            float _10149;
            vec2 _17662;
            float _16309 = _Globals_.g_flWaterInitialDirection;
            uint _17018 = 0u;
            SPIRV_CROSS_UNROLL
            for (;;)
            {
                if (!(_17018 < 3u))
                {
                    break;
                }
                _17662 = _17134.xy + (((((texture(sampler2D(g_tWavesNormalHeight, DefaultSamplerState_0_2), fma(vec2(sin(_16309), cos(_16309)) * ((input_0 * _Globals_.g_flWavesSpeed) * 0.5), sqrt(vec2(1.0) / _13139), (_5614.xy + _17134) / _13139).xy, fma(-_Globals_.g_flCausticSharpness, 1.0 - clamp(_21725, 0.0, 1.0), 1.0) * 6.0).xyz - vec3(0.5)).xy * 0.5) * _Globals_.g_flCausticDistortion) * (vec2(1.0) + _13139)) * (0.25 + _21725));
                _9859 = _13139 * _Globals_.g_flWavesPhaseOffset;
                _7275 = _17018 + 1u;
                _10149 = _16309 + (3.5 / float(_7275));
                _13139 = _9859;
                _16309 = _10149;
                _17134 = _17662;
                _17018 = _7275;
                continue;
            }
            vec2 _13140;
            vec3 _17135;
            _13140 = _Globals_.g_vWaveScale;
            _17135 = vec3(0.0);
            uint _7276;
            vec2 _9860;
            float _10150;
            vec3 _18461;
            float _16310 = _Globals_.g_flWaterInitialDirection;
            uint _17019 = 0u;
            SPIRV_CROSS_UNROLL
            for (;;)
            {
                if (!(_17019 < 3u))
                {
                    break;
                }
                float _7661 = float(_17019) / (float(_19857) - 1.0);
                float _15478 = 1.0 - clamp(_21725, 0.0, 1.0);
                float _18289 = _Globals_.g_flCausticSharpness * _15478;
                _18461 = _17135 + (((((pow(vec3(texture(sampler2D(g_tWavesNormalHeight, DefaultSamplerState_0_2), fma(vec2(sin(_16310), cos(_16310)) * ((input_0 * _Globals_.g_flWavesSpeed) * 0.5), sqrt(vec2(1.0) / _13140), (_5614.xy + _17134) / _13140).xy, fma(-_Globals_.g_flCausticSharpness, _15478, 1.0) * 6.0).z), vec3(_18289 * 5.0)) * clamp(mix(mix(fma(_17121, 0.100000001490116119384765625, _Globals_.g_flLowFreqWeight), _Globals_.g_flMedFreqWeight + _17121, clamp(_7661 * 2.0, 0.0, 1.0)), fma(_Globals_.g_flHighFreqWeight, _24840, _17121), clamp(fma(_7661, 2.0, -1.0), 0.0, 1.0)), 0.100000001490116119384765625, 0.4000000059604644775390625)) * (vec3(1.0) + (_17135 * 2.0))) * _20067) * _18289) * 2.0);
                _9860 = _13140 * _Globals_.g_flWavesPhaseOffset;
                _7276 = _17019 + 1u;
                _10150 = _16310 + (3.5 / float(_7276));
                _13140 = _9860;
                _16310 = _10150;
                _17135 = _18461;
                _17019 = _7276;
                continue;
            }
            vec4 _24260 = (vec4((_7984.xyz + ((vec3(_17134, 0.0) * 60.0) * _17135.x)).xyz, 1.0) + (PerViewConstantBuffer_t.g_vWorldToCameraOffset * 1.0)).xyzw * mat4(vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].x, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].y, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].z, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToProjection._m0[0].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[1].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[2].w, PerViewConstantBuffer_t.g_matWorldToProjection._m0[3].w));
            vec2 _10508 = _24260.xy / vec2(_24260.w);
            vec2 _22988 = (vec2(_10508.x, -_10508.y) * 0.5) + vec2(0.5);
            vec4 _7439 = texture(sampler2D(g_tWaterEffectsMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), (_22988.xy * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy).xy) - vec4(0.5);
            vec2 _20390 = clamp(_7439.yz * 2.0, vec2(0.0), vec2(1.0));
            vec4 _13514 = _7439;
            _13514.y = _20390.x;
            _13514.z = _20390.y;
            float _14324 = _22988.y;
            float _14538 = _22988.x;
            vec4 _4276 = _13514 * clamp((((_14324 * (1.0 - _14324)) * _14538) * (1.0 - _14538)) * 40.0, 0.0, 1.0);
            float _17901 = _4276.x;
            float _23883 = _17901 + (_17901 / fma(fwidth(_17901), 1000.0, 0.5));
            vec3 _16129 = (_17135 + vec3(fma(clamp(_23883, 0.0, 1.0) * 4.0, _Globals_.g_flWaterEffectCausticStrength, -((clamp(-_23883, 0.0, 1.0) * 0.1500000059604644775390625) * _Globals_.g_flWaterEffectCausticStrength)))) * mix(1.0, 0.0, clamp(fma(_20466, 2.0, _4276.y * 0.4000000059604644775390625), 0.0, 1.0));
            float _13526 = _16129.x;
            vec3 _4046 = _17565 * (vec3(1.0) + (((((pow(max(_16129 * (vec3(1.0) + (vec3(1.25, -0.25, -1.0) * (clamp(dFdxFine(_13526) * 200.0, -1.0, 1.0) * clamp(fma(-_13526, 3.0, 1.0), 0.0, 1.0)))), vec3(0.001000000047497451305389404296875)) * 8.0, vec3(2.5)) * _9945) * undetermined._m3.xyz) * _Globals_.g_vCausticsTint.xyz) * _Globals_.g_flCausticsStrength) * 0.100000001490116119384765625));
            float _16517 = pow(dot(_4046.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)), 0.20000000298023223876953125);
            float _14717 = clamp(dFdxFine(_16517), -1.0, 1.0) + clamp(dFdyFine(_16517), -1.0, 1.0);
            _13141 = _16121;
            _16381 = mix(_4046, _4046 * (vec3(1.0) + (vec3(2.5, 0.0, -2.0) * float(int(sign(_14717 * clamp(abs(_14717) - 0.100000001490116119384765625, 0.0, 1.0)))))), vec3(clamp(200.0 / _3558, 0.0, 1.0) * 0.100000001490116119384765625));
            _16479 = _4276.z;
        }
        else
        {
            _13141 = vec4(0.0);
            _16381 = _17565;
            _16479 = 0.0;
        }
        _13142 = _13141;
        _16311 = _16381;
        _17126 = _16479;
        _13618 = _5358;
        _6414 = fma(max((-(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.x / fma(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.y, _11356, PerViewConstantBuffer_t.g_vDepthPsToVsConversion.z))) - _18935, 0.0), 0.00999999977648258209228515625, _13136);
    }
    else
    {
        _13142 = vec4(0.0);
        _16311 = vec3(0.0);
        _17126 = 0.0;
        _13618 = _Globals_.g_flWaterFogStrength;
        _6414 = _12918;
    }
    float _17582 = min(_Globals_.g_flWaterMaxDepth, _6414);
    vec3 _11466 = exp(((_Globals_.g_vWaterDecayColor - vec3(1.0)) * vec3(_Globals_.g_flWaterDecayStrength)) * _17582);
    float _8790 = max(_13618, _17126);
    float _5578 = _23301 + clamp(_17126 - 0.5, 0.0, 1.0);
    float _4632 = fma(fma(-clamp(_24418, 0.0, 1.0), 0.25, _5578), 0.100000001490116119384765625, 1.0 - exp((-_17582) * _8790));
    vec3 _5353 = mix(_Globals_.g_vWaterFogColor, _5903, vec3(_5578 * 0.100000001490116119384765625)) * mix(_11466, vec3(1.0), vec3(clamp(_8790 * 0.039999999105930328369140625, 0.0, 1.0)));
    vec3 _6892 = -normalize(_10932.xyz - PerViewConstantBuffer_t.g_vCameraPositionWs.xyz);
    float _16838 = clamp(dot(-undetermined._m2.xyz, reflect(_6892, normalize(mix(normalize(_10251).xyz, _24109.xyz, vec3(_Globals_.g_flSpecularNormalMultiple * fma(_3558, 0.0005000000237487256526947021484375, 1.0)))))), 0.0, 1.0);
    float _3579 = mix(_Globals_.g_flSpecularPower, _Globals_.g_flDebrisReflectance * 8.0, _23667) * mix(2.0, 0.20000000298023223876953125, clamp(_24840, 0.0, 1.0));
    float _16583 = fma(pow(_16838, _3579), 0.100000001490116119384765625, pow(_16838, _3579 * 10.0));
    float _6965 = -_24720;
    float _9615 = 1.0 - _4632;
    float _3039 = (clamp((1.0 - _23667) + _10350, 0.0, 1.0) * clamp(fma(_6965, 4.0, 1.0), 0.0, 1.0)) * _9615;
    vec3 _13711 = input_2.xyz + (((-_11306) * (vec3(_10644 * (-1.0)) + (((mix(_19511.xxx, vec3(_19511.xy, 0.0), vec3(0.100000001490116119384765625)) * 90.0) * pow(_3039, 2.0)) + vec3(_Globals_.g_flWaterPlaneOffset)))) * mix(1.0, _17582 * 2.0, 0.75));
    vec4 _23875 = vec4(_9982.xyz, 1.0);
    vec3 _19477 = vec3(dot(undetermined._m0._m0[0].xyzw, _23875), dot(undetermined._m0._m0[1].xyzw, _23875), dot(undetermined._m0._m0[2].xyzw, _23875));
    float _25086;
    if (undetermined._m7 != 0)
    {
        vec4 _20786 = vec4(_13711.xyz, 1.0);
        int _23989;
        int _10191;
        float _13143;
        vec3 _14975;
        int _13039 = 0;
        for (;;)
        {
            if (!(_13039 < undetermined._m7))
            {
                _13143 = 1.0;
                _14975 = vec3(0.0);
                _10191 = -1;
                break;
            }
            vec4 _22357 = _20786 * mat4(vec4(undetermined._m14._m0[_13039]._m0[0].x, undetermined._m14._m0[_13039]._m0[1].x, undetermined._m14._m0[_13039]._m0[2].x, undetermined._m14._m0[_13039]._m0[3].x), vec4(undetermined._m14._m0[_13039]._m0[0].y, undetermined._m14._m0[_13039]._m0[1].y, undetermined._m14._m0[_13039]._m0[2].y, undetermined._m14._m0[_13039]._m0[3].y), vec4(undetermined._m14._m0[_13039]._m0[0].z, undetermined._m14._m0[_13039]._m0[1].z, undetermined._m14._m0[_13039]._m0[2].z, undetermined._m14._m0[_13039]._m0[3].z), vec4(undetermined._m14._m0[_13039]._m0[0].w, undetermined._m14._m0[_13039]._m0[1].w, undetermined._m14._m0[_13039]._m0[2].w, undetermined._m14._m0[_13039]._m0[3].w));
            float _12779 = _22357.x;
            if (max(abs(_12779), abs(_22357.y)) < undetermined._m9[_13039])
            {
                vec3 _19470 = vec3(_12779, _22357.yz);
                vec2 _24729 = _19470.xy;
                vec2 _21013 = vec2(1.0) - clamp(fma(abs(_24729), vec2(undetermined._m11), vec2(undetermined._m10)), vec2(0.0), vec2(1.0));
                vec2 _13662 = fma(_24729, undetermined._m15._m0[_13039].zw, undetermined._m15._m0[_13039].xy);
                vec3 _19310 = _19470;
                _19310.x = _13662.x;
                _19310.y = _13662.y;
                _13143 = clamp(_21013.x * _21013.y, 0.0, 1.0);
                _14975 = _19310;
                _10191 = _13039;
                break;
            }
            _23989 = _13039 + 1;
            _13039 = _23989;
            continue;
        }
        float _7182;
        if (_10191 >= 0)
        {
            float _18270 = textureLod(sampler2DShadow(g_tShadowDepthBufferDepth, AddressU_2_AddressV_2_Filter_149_ComparisonFunc_3), vec3(_14975.xy, clamp(_14975.z + undetermined._m8, 0.0, 1.0)), 0.0);
            float _12501;
            if (_13143 < 1.0)
            {
                float _7934;
                if (_10191 < (undetermined._m7 - 1))
                {
                    int _14126 = _10191 + 1;
                    vec4 _23706 = _20786 * mat4(vec4(undetermined._m14._m0[_14126]._m0[0].x, undetermined._m14._m0[_14126]._m0[1].x, undetermined._m14._m0[_14126]._m0[2].x, undetermined._m14._m0[_14126]._m0[3].x), vec4(undetermined._m14._m0[_14126]._m0[0].y, undetermined._m14._m0[_14126]._m0[1].y, undetermined._m14._m0[_14126]._m0[2].y, undetermined._m14._m0[_14126]._m0[3].y), vec4(undetermined._m14._m0[_14126]._m0[0].z, undetermined._m14._m0[_14126]._m0[1].z, undetermined._m14._m0[_14126]._m0[2].z, undetermined._m14._m0[_14126]._m0[3].z), vec4(undetermined._m14._m0[_14126]._m0[0].w, undetermined._m14._m0[_14126]._m0[1].w, undetermined._m14._m0[_14126]._m0[2].w, undetermined._m14._m0[_14126]._m0[3].w));
                    vec2 _13663 = fma(_23706.xy, undetermined._m15._m0[_14126].zw, undetermined._m15._m0[_14126].xy);
                    vec3 _19311;
                    _19311.x = _13663.x;
                    _19311.y = _13663.y;
                    _7934 = textureLod(sampler2DShadow(g_tShadowDepthBufferDepth, AddressU_2_AddressV_2_Filter_149_ComparisonFunc_3), vec3(_19311.xy, clamp(_23706.z + undetermined._m8, 0.0, 1.0)), 0.0);
                }
                else
                {
                    _7934 = 1.0;
                }
                _12501 = mix(_7934, _18270, _13143);
            }
            else
            {
                _12501 = _18270;
            }
            _7182 = _12501;
        }
        else
        {
            _7182 = 1.0;
        }
        float _14115 = mix(_7182, 1.0, clamp(fma(distance(_19475, PerViewConstantBuffer_t.g_vCameraPositionWs), undetermined._m13, undetermined._m12), 0.0, 1.0));
        float _12502;
        if (notEqual(PerViewConstantBufferCsgo_t.g_bOtherFxEnabled, ivec4(0)).y)
        {
            _12502 = min(_14115, textureLod(sampler2D(g_tParticleShadowBuffer, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), (_21298.xy * PerViewConstantBuffer_t.g_vInvGBufferSize.xy).xy, 0.0).z);
        }
        else
        {
            _12502 = _14115;
        }
        _25086 = _12502;
    }
    else
    {
        _25086 = 1.0;
    }
    float _12256 = mix(_25086, 1.0, _3039 * 0.5);
    vec3 _21709;
    if ((dot(undetermined._m2.xyz, _9982.xyz) * _12256) > 0.0)
    {
        _21709 = fma(vec3(max(0.0, dot(_9982.xyz, undetermined._m2.xyz))).xyz, (undetermined._m3.xyz * _12256).xyz, undetermined._m1.xyz);
    }
    else
    {
        _21709 = undetermined._m1.xyz;
    }
    bvec4 _24465 = notEqual(PerViewConstantBufferCsgo_t.g_bOtherEnabled2, ivec4(0));
    bool _20060 = _24465.x;
    vec4 _20617;
    if (_20060)
    {
        vec4 _24261 = vec4(_19475, 1.0).xyzw * mat4(vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].x, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].x), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].y, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].y), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].z, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].z), vec4(PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[0].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[1].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[2].w, PerViewConstantBufferCsgo_t.g_matPrimaryViewWorldToProjection._m0[3].w));
        float _20181 = _24261.w;
        vec2 _11414 = _24261.xy / vec2(_20181);
        vec4 _6654;
        _6654.x = clamp(((_11414.x + 1.0) * PerViewConstantBuffer_t.g_vViewportSize.x) * 0.5, 0.0, PerViewConstantBuffer_t.g_vViewportSize.x - 1.0);
        _6654.y = clamp(((1.0 - _11414.y) * PerViewConstantBuffer_t.g_vViewportSize.y) * 0.5, 0.0, PerViewConstantBuffer_t.g_vViewportSize.y - 1.0);
        _6654.w = _20181;
        _20617 = _6654;
    }
    else
    {
        _20617 = _21298;
    }
    uvec2 _12083 = uvec2(_20617.xy - PerViewConstantBuffer_t.g_vViewportOffset.xy) >> uvec2(undetermined._m5.x);
    uint _10838 = undetermined._m4.y + (((_12083.y * undetermined._m5.y) + _12083.x) * undetermined._m4.z);
    uint _23393 = undetermined._m4.x + (uint(clamp(_20617.w * undetermined._m6.x, 0.0, undetermined._m6.y)) * undetermined._m4.z);
    vec3 _13155;
    _13155 = _21709;
    uint _7172;
    vec3 _13156;
    uint _16208 = 0u;
    for (;;)
    {
        if (!(_16208 < undetermined._m4.z))
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
                vec3 _14644 = _13711.xyz;
                vec4 _15817 = mat4(vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].x, g_BarnLights_1._m0[_11281]._m0._m0[1].x, g_BarnLights_1._m0[_11281]._m0._m0[2].x, g_BarnLights_1._m0[_11281]._m0._m0[3].x), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].y, g_BarnLights_1._m0[_11281]._m0._m0[1].y, g_BarnLights_1._m0[_11281]._m0._m0[2].y, g_BarnLights_1._m0[_11281]._m0._m0[3].y), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].z, g_BarnLights_1._m0[_11281]._m0._m0[1].z, g_BarnLights_1._m0[_11281]._m0._m0[2].z, g_BarnLights_1._m0[_11281]._m0._m0[3].z), vec4(g_BarnLights_1._m0[_11281]._m0._m0[0].w, g_BarnLights_1._m0[_11281]._m0._m0[1].w, g_BarnLights_1._m0[_11281]._m0._m0[2].w, g_BarnLights_1._m0[_11281]._m0._m0[3].w)) * vec4(_13711.xyz, 1.0);
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
                _12504 = fma(vec3(max(0.0, dot(_9982.xyz, _11179.xyz))).xyz, _19629.xyz, _13156.xyz);
                break;
            } while(false);
            _13156 = _12504;
            _16209 = _20344;
            continue;
        }
        _13155 = _13156;
        _16208 = _7172;
        continue;
    }
    vec3 _20780 = _19477.xyz;
    vec3 _22686 = (_13155.xyz + _20780) * mix(mix((_5353 * _4632) * _Globals_.g_flWaterFogShadowStrength, _5903.xyz, vec3(_24720)), vec4(_18109.xyz * fma(_4500, 0.5, 0.5), _23667).xyz * _Globals_.g_vDebrisTint, vec3(clamp(_23667 - _10350, 0.0, 1.0))).xyz;
    vec4 _11206 = vec4(_22686, _21011);
    _11206.x = _22686.x;
    _11206.y = _22686.y;
    _11206.z = _22686.z;
    vec3 _25191 = mix(_11206.xyz, _16311 * _11466, vec3(_3039));
    vec4 _17842 = _11206;
    _17842.x = _25191.x;
    _17842.y = _25191.y;
    _17842.z = _25191.z;
    vec3 _10929 = mix(_17842.xyz, (_5353 * 4.0) * _20780, vec3((_4632 * clamp((1.0 - _11381) + _10350, 0.0, 1.0)) * (1.0 - _Globals_.g_flWaterFogShadowStrength)));
    vec4 _17843 = _17842;
    _17843.x = _10929.x;
    _17843.y = _10929.y;
    _17843.z = _10929.z;
    vec3 _4003 = (textureLod(samplerCube(g_tLowEndCubeMap, DefaultSamplerState_0_1), (-reflect(_6892, _9982).xyz).xyz, sqrt(dot(mix(_Globals_.g_vRoughness, vec2(1.0), vec2(clamp(_4694, 0.0, 0.3499999940395355224609375))).xy, vec2(0.5))) * 6.0).xyz * (dot(_19477.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)) * _Globals_.g_flLowEndCubeMapIntensity)) * _Globals_.g_flEnvironmentMapBrightness;
    float _9473 = clamp((PerViewConstantBuffer_t.g_vCameraDirWs.z + 0.75) * 4.0, 0.0, 1.0);
    float _13437 = float(_20058);
    uint _4344 = uint((float(_Globals_.g_nSSRMaxForwardSteps) * mix(1.0, 0.5, _13437)) * _9473);
    vec3 _21517;
    if (_4344 > 0u)
    {
        float _4799 = fma(_23099, _Globals_.g_flSSRSampleJitter, _Globals_.g_flSSRMaxThickness);
        mat4 _15579 = mat4(vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].x, PerViewConstantBuffer_t.g_matWorldToView._m0[1].x, PerViewConstantBuffer_t.g_matWorldToView._m0[2].x, PerViewConstantBuffer_t.g_matWorldToView._m0[3].x), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].y, PerViewConstantBuffer_t.g_matWorldToView._m0[1].y, PerViewConstantBuffer_t.g_matWorldToView._m0[2].y, PerViewConstantBuffer_t.g_matWorldToView._m0[3].y), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].z, PerViewConstantBuffer_t.g_matWorldToView._m0[1].z, PerViewConstantBuffer_t.g_matWorldToView._m0[2].z, PerViewConstantBuffer_t.g_matWorldToView._m0[3].z), vec4(PerViewConstantBuffer_t.g_matWorldToView._m0[0].w, PerViewConstantBuffer_t.g_matWorldToView._m0[1].w, PerViewConstantBuffer_t.g_matWorldToView._m0[2].w, PerViewConstantBuffer_t.g_matWorldToView._m0[3].w));
        vec4 _24221 = vec4(normalize(vec3((_9982.xy * 3.0) * mix(2.0, 8.0, _13437), _9982.z)).xyz, 0.0).xyzw * _15579;
        vec3 _15169 = _24221.xyz;
        vec2 _23669 = _24221.yz * 2.0;
        _15169.y = _23669.x;
        _15169.z = _23669.y;
        vec3 _22729 = (vec4(_10932.xyz, 1.0).xyzw * _15579).xyz;
        mat4 _21991 = mat4(vec4(PerViewConstantBuffer_t.g_matViewToProjection._m0[0].x, PerViewConstantBuffer_t.g_matViewToProjection._m0[1].x, PerViewConstantBuffer_t.g_matViewToProjection._m0[2].x, PerViewConstantBuffer_t.g_matViewToProjection._m0[3].x), vec4(PerViewConstantBuffer_t.g_matViewToProjection._m0[0].y, PerViewConstantBuffer_t.g_matViewToProjection._m0[1].y, PerViewConstantBuffer_t.g_matViewToProjection._m0[2].y, PerViewConstantBuffer_t.g_matViewToProjection._m0[3].y), vec4(PerViewConstantBuffer_t.g_matViewToProjection._m0[0].z, PerViewConstantBuffer_t.g_matViewToProjection._m0[1].z, PerViewConstantBuffer_t.g_matViewToProjection._m0[2].z, PerViewConstantBuffer_t.g_matViewToProjection._m0[3].z), vec4(PerViewConstantBuffer_t.g_matViewToProjection._m0[0].w, PerViewConstantBuffer_t.g_matViewToProjection._m0[1].w, PerViewConstantBuffer_t.g_matViewToProjection._m0[2].w, PerViewConstantBuffer_t.g_matViewToProjection._m0[3].w));
        vec4 _15818 = _21991 * vec4(-_22729, 1.0);
        vec3 _10509 = _15818.xyz / vec3(_15818.w);
        vec2 _21671 = (vec2(_10509.x, -_10509.y) * 0.5) + vec2(0.5);
        vec4 _20492;
        _20492.x = _21671.x;
        _20492.y = _21671.y;
        float _9277 = (fma(_23099, _Globals_.g_flSSRSampleJitter, _Globals_.g_flSSRStepSize) / fma(_4694, 2.0, 1.0)) * mix(20.0, 1.0, _16004);
        float _14946;
        if (_20058)
        {
            _14946 = _9277 * (_3558 * 0.00200000009499490261077880859375);
        }
        else
        {
            _14946 = _9277;
        }
        vec3 _25073 = normalize(reflect(normalize(_22729), normalize(_15169))).xyz;
        vec3 _16312;
        vec4 _17127;
        uint _17136;
        _16312 = _22729;
        _17127 = _20492;
        _17136 = 1u;
        float _3353;
        float _3746;
        vec3 _5027;
        vec4 _19411;
        float _22492;
        uint _23990;
        float _9985;
        vec4 _23824;
        float _13144 = 0.0;
        float _17020 = 0.0;
        float _17128 = _14946;
        for (;;)
        {
            if (!(_17136 <= _4344))
            {
                _9985 = _17020;
                _23824 = _17127;
                break;
            }
            _3353 = _17128 * 1.14999997615814208984375;
            _5027 = _16312 + (_25073 * _3353);
            vec4 _18209 = _21991 * vec4(-_5027, 1.0);
            vec3 _10510 = _18209.xyz / vec3(_18209.w);
            vec2 _21672 = (vec2(_10510.x, -_10510.y) * 0.5) + vec2(0.5);
            vec4 _20493;
            _20493.x = _21672.x;
            _19411 = _20493;
            _19411.y = _21672.y;
            _3746 = (PerViewConstantBuffer_t.g_vDepthPsToVsConversion.x / fma(PerViewConstantBuffer_t.g_vDepthPsToVsConversion.y, clamp((textureLod(sampler2D(g_tSceneDepth, AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2_Filter_0_AddressW_2), _19411.xy * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy, 0.0).x - PerViewConstantBuffer_t.g_flViewportMinZ) / (PerViewConstantBuffer_t.g_flViewportMaxZ - PerViewConstantBuffer_t.g_flViewportMinZ), 0.0, 1.0), PerViewConstantBuffer_t.g_vDepthPsToVsConversion.z)) - _5027.z;
            _22492 = clamp(_3746 / (_3746 - _13144), 0.0, 1.0);
            bool _12887;
            if (_3746 >= 0.0)
            {
                _12887 = _3746 < (_4799 * _3353);
            }
            else
            {
                _12887 = false;
            }
            if (_12887)
            {
                _9985 = _22492;
                _23824 = mix(_19411, _17127, vec4(_22492));
                break;
            }
            _23990 = _17136 + 1u;
            _13144 = _3746;
            _16312 = _5027;
            _17127 = _19411;
            _17128 = _3353;
            _17136 = _23990;
            _17020 = _22492;
            continue;
        }
        float _5420 = (float(_17136) - _9985) / float(_4344);
        vec3 _18231;
        if (_8776)
        {
            vec2 _15599 = (_23824.xy * PerViewConstantBuffer_t.g_vViewportToGBufferRatio.xy).xy;
            float _8505 = _5420 * (-0.00390625);
            vec3 _14528 = (((texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), clamp(_15599 - vec2(_5420 * 0.00390625), vec2(0.0), vec2(1.0)).xy).xyz * 0.4444443881511688232421875) + (texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), clamp(_15599 + vec2(0.001953125, _8505), vec2(0.0), vec2(1.0)).xy).xyz * 0.22222219407558441162109375)) + (texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), clamp(_15599 + vec2(_8505, 0.001953125), vec2(0.0), vec2(1.0)).xy).xyz * 0.22222219407558441162109375)) + (texture(sampler2D(g_tRefractionMap, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), clamp(_15599 + vec2(0.001953125), vec2(0.0), vec2(1.0)).xy).xyz * 0.111111097037792205810546875);
            _18231 = (_14528 + ((normalize(_14528 + vec3(0.001000000047497451305389404296875)) * max(0.0, dot(_14528.xyz, vec3(0.2125000059604644775390625, 0.7153999805450439453125, 0.07209999859333038330078125)) - _Globals_.g_flSSRBoostThreshold)) * _Globals_.g_flSSRBoost)) * _Globals_.g_flSSRBrightness;
        }
        else
        {
            _18231 = mix((_17843.xyz + _4003) * 0.5, _4003, vec3(_5420));
        }
        _21517 = mix(_4003, _18231, vec3((clamp(1.0 - pow(_5420, 4.0), 0.0, 1.0) * clamp(_23824.y * 8.0, 0.0, 1.0)) * clamp(_9473 * 2.0, 0.0, 1.0)));
    }
    else
    {
        _21517 = _4003;
    }
    float _12717 = mix(_Globals_.g_flReflectance, _Globals_.g_flDebrisReflectance, _4500);
    float _4658 = (fma(_6813, 1.0 - _12717, _12717) * fma(_6965, 2.0, fma(-_11381, 0.75, 1.0))) * 1.5;
    vec3 _12059 = fma((_13155.xyz * (fma(max(0.0, _16583 - (1.0 - _Globals_.g_flSpecularBloomBoostThreshold)), _Globals_.g_flSpecularBloomBoostStrength, _16583) * mix(1.0, _Globals_.g_flDebrisReflectance * 0.0500000007450580596923828125, _23667))) * _4658, undetermined._m3.xyz, _17843.xyz);
    vec4 _19314 = _17843;
    _19314.x = _12059.x;
    _19314.y = _12059.y;
    _19314.z = _12059.z;
    float _8302 = fract(fma(PerViewConstantBuffer_t.g_flTime, 0.100000001490116119384765625, fma(_6813, 20.0, _15684 * 8.0)));
    float _15999 = floor(_8302 * 6.0);
    float _22138 = fma(_8302, 6.0, -_15999);
    float _6700 = 0.75 * (1.0 - _22138);
    float _14751 = 0.75 * _22138;
    vec3 _11313;
    if (_15999 == 0.0)
    {
        _11313 = vec3(0.75, _14751, 0.0);
    }
    else
    {
        vec3 _12509;
        if (_15999 == 1.0)
        {
            _12509 = vec3(_6700, 0.75, 0.0);
        }
        else
        {
            vec3 _12508;
            if (_15999 == 2.0)
            {
                _12508 = vec3(0.0, 0.75, _14751);
            }
            else
            {
                vec3 _12506;
                if (_15999 == 3.0)
                {
                    _12506 = vec3(0.0, _6700, 0.75);
                }
                else
                {
                    vec3 _12505;
                    if (_15999 == 4.0)
                    {
                        _12505 = vec3(_14751, 0.0, 0.75);
                    }
                    else
                    {
                        _12505 = vec3(0.75, 0.0, _6700);
                    }
                    _12506 = _12505;
                }
                _12508 = _12506;
            }
            _12509 = _12508;
        }
        _11313 = _12509;
    }
    vec3 _14119 = _19314.xyz * mix(vec3(1.0), _20780 * 0.75, vec3(clamp(_13142.w * 4.0, 0.0, 1.0) * _9615));
    vec4 _23717 = _19314;
    _23717.x = _14119.x;
    _23717.y = _14119.y;
    _23717.z = _14119.z;
    vec3 _19800 = mix(_23717.xyz, mix(_21517, _21517 * _11313, vec3(((clamp(_10350 * 20.0, 0.0, 1.0) * _Globals_.g_flDebrisOilyness) / fma(_3558, 0.004999999888241291046142578125, 1.0)) * clamp(fma(-_5722, 5.0, 1.0), 0.0, 1.0))), vec3(clamp(_4658, 0.0, 1.0)));
    vec4 _17844 = _23717;
    _17844.x = _19800.x;
    _17844.y = _19800.y;
    _17844.z = _19800.z;
    vec4 _22526;
    if (_Globals_.g_bFogEnabled != 0)
    {
        vec3 _21493;
        vec3 _23187 = _19475 - PerViewConstantBuffer_t.g_vCameraPositionWs.xyz;
        vec3 _9057 = _23187.xyz;
        vec3 _19340;
        do
        {
            _21493 = _23187.xyz;
            bool _12888;
            if (dot(_21493, _21493) > PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.x)
            {
                _12888 = (_7715.z * PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.z) < PerViewConstantBufferCsgo_t.g_vGradientFogCullingParams.y;
            }
            else
            {
                _12888 = false;
            }
            if (_12888)
            {
                vec2 _6354 = clamp(fma(PerViewConstantBufferCsgo_t.g_vGradientFogBiasAndScale.zw, vec2(length(_21493), _7715.z), PerViewConstantBufferCsgo_t.g_vGradientFogBiasAndScale.xy), vec2(0.0), vec2(1.0));
                float _12872 = (pow(_6354.x, PerViewConstantBufferCsgo_t.m_vGradientFogExponents.x) * pow(_6354.y, PerViewConstantBufferCsgo_t.m_vGradientFogExponents.y)) * PerViewConstantBufferCsgo_t.g_vGradientFogColor_Opacity.w;
                _19340 = mix(_17844.xyz, vec4(PerViewConstantBufferCsgo_t.g_vGradientFogColor_Opacity.xyz, _12872).xyz, vec3(_12872));
                break;
            }
            _19340 = _17844.xyz;
            break;
        } while(false);
        vec4 _23944 = _17844;
        _23944.x = _19340.x;
        _23944.y = _19340.y;
        _23944.z = _19340.z;
        vec3 _19341;
        do
        {
            bool _12889;
            if (dot(_9057, _9057) > PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.x)
            {
                _12889 = (PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.z * _7715.z) < PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.y;
            }
            else
            {
                _12889 = false;
            }
            if (_12889)
            {
                float _14602 = clamp(pow(max(0.0, fma(length(_21493), PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.y, PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.x)), PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.w), 0.0, 1.0) * clamp(pow(max(0.0, fma(_7715.z, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.y, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.x)), PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.z), 0.0, 1.0);
                float _8892 = clamp(_14602, 0.0, 1.0) * PerViewConstantBufferCsgo_t.g_vCubeFogCullingParams_MaxOpacity.w;
                _19341 = mix(_23944.xyz, vec4((textureLod(samplerCube(g_tFogCubeTexture, Filter_21_AllowGlobalMipBiasOverride_0_AddressU_2_AddressV_2), normalize((mat4(vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].x, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].x), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].y, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].y), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].z, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].z), vec4(PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[0].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[1].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[2].w, PerViewConstantBufferCsgo_t.g_matvCubeFogSkyWsToOs._m0[3].w)) * vec4(_9057, 0.0)).xyz).xyz, PerViewConstantBufferCsgo_t.g_vCubeFog_Height_Offset_Scale_Exponent_Log2Mip.w * clamp(fma(-_14602, PerViewConstantBufferCsgo_t.g_vCubeFog_Offset_Scale_Bias_Exponent.z, 1.0), 0.0, 1.0)) * PerViewConstantBufferCsgo_t.g_vCubeFog_ExposureBias.x).xyz, _8892).xyz, vec3(_8892));
                break;
            }
            _19341 = _23944.xyz;
            break;
        } while(false);
        _23944.x = _19341.x;
        _23944.y = _19341.y;
        _23944.z = _19341.z;
        _22526 = _23944;
    }
    else
    {
        _22526 = _17844;
    }
    vec4 _10386 = _22526;
    _10386.w = 1.0;
    if (_8776)
    {
        vec2 _3206 = abs(vec2(0.5) - _19865) * 2.0;
        if ((clamp(1.0 - clamp((max(_3206.x, _3206.y) - (1.0 - _Globals_.g_flSkyBoxFadeRange)) / _Globals_.g_flSkyBoxFadeRange, 0.0, 1.0), 0.0, 1.0) - _24418) < 0.0)
        {
            discard;
        }
    }
    vec4 _12890;
    if (_8776)
    {
        _12890 = vec4(mix((_14948.xyz * mix(1.0, 0.60000002384185791015625, clamp(_5722 * 60.0, 0.0, 1.0) / fma(_3558, 0.00200000009499490261077880859375, 1.0))).xyz, _10386.xyz, vec3(clamp(fma(_Globals_.g_flEdgeHardness, _17582, clamp(_24720, 0.0, 1.0)) + fma(_15684, 2.0, -0.5), 0.0, 1.0))), 1.0);
    }
    else
    {
        _12890 = _10386;
    }
    vec4 _6805;
    if (_4637 > 0.0)
    {
        vec4 _3401 = texelFetch(g_tMoitFinal, _11700, 0);
        vec3 _8598 = _3401.xyz * (_4637 / (_3401.w + 9.9999997473787516355514526367188e-06));
        vec4 _8677;
        _8677.x = _8598.x;
        _8677.y = _8598.y;
        _8677.z = _8598.z;
        vec3 _24094 = _8677.xyz + (_12890.xyz * _21877);
        vec4 _20494 = _12890;
        _20494.x = _24094.x;
        _20494.y = _24094.y;
        _20494.z = _24094.z;
        _6805 = _20494;
    }
    else
    {
        _6805 = _12890;
    }
    output_0 = _6805;
}


