#version 460

#define F_SECONDARY_UV 0
#define F_SECONDARY_AO 0

// Blend specific features
#if defined(csgo_environment_blend_vfx)

    // Blend Effects
    #define F_BLEND_EFFECTS 0
    #define F_BORDER_ROUGHNESS 0
    #define F_BORDER_BLEND_MODE 0 // 0="Multiply", 1="Add", 2="Overlay", 3="Colorize"

    #define F_SHARED_COLOR_OVERLAY 0
    #define F_ENABLE_LAYER_3 0
    #define F_DEPTH_BIAS 0
#endif

#define F_DETAIL_NORMAL 0
uniform int F_DETAIL_NORMAL_USES_SECONDARY_UVS;
#define F_ALPHA_TEST 0
