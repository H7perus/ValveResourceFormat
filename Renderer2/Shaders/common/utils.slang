module utils;

public static const float PI = 3.1415926535897932384626433832795;
// tau = PI*2
public static const float TAU = 6.2831853071795864769252867665590;

public static const float INCH_TO_M = 0.0254;

// clamp(value, 0.0, 1.0)
public float saturate(float val) {
    return clamp(val, 0, 1);
}
public float2 saturate(float2 val) {
    return clamp(val, 0.0, 1.0);
}
public float3 saturate(float3 val) {
    return clamp(val, 0.0, 1.0);
}
public float4 saturate(float4 val) {
    return clamp(val, 0.0, 1.0);
}

// value^2
public float pow2(float val)
{
    return(val * val);
}
public float2 pow2(float2 val)
{
    return(val * val);
}
public float3 pow2(float3 val)
{
    return(val * val);
}
public float4 pow2(float4 val)
{
    return(val * val);
}

public float pow5(float val)
{
    return pow(val, 5.0); // Should get optimized
}

// Guards against pow(0, 0) = NaN by clamping the base off zero.
public float SafePow(float base, float exponent)
{
    return pow(max(base, 1e-9), exponent);
}
public float2 SafePow(float2 base, float2 exponent)
{
    return pow(max(base, float2(1e-9)), exponent);
}
public float3 SafePow(float3 base, float3 exponent)
{
    return pow(max(base, float3(1e-9)), exponent);
}

public float Random2D(float2 Seed)
{
    return fract(sin( dot(Seed, float2(12.9898, 78.233)) ) * 43758.5469);
}

public float min3( float3 Vector )
{
	return min( min( Vector.x, Vector.y ), Vector.z );
}
public float max3( float3 Vector )
{
	return max( max( Vector.x, Vector.y ), Vector.z );
}

public float length_squared(float2 vector)
{
	return dot(vector, vector);
}
public float length_squared(float3 vector)
{
	return dot(vector, vector);
}
public float length_squared(float4 vector)
{
	return dot(vector, vector);
}


// Color

public const static float3 gamma = float3(2.4);
public const static float3 invGamma = float3(1.0 / gamma);

public float GetLuma(float3 Color) {
	return dot( Color, float3(0.2125, 0.7154, 0.0721) ); // BT.709-1, same as Valve
}

public float LevelsAdjust(float component, float3 L_BlackWhiteGamma)
{
    float3 levels = float3(
        -L_BlackWhiteGamma.x,
        -1.4427 * log2(max(0.0001, 1.0 - L_BlackWhiteGamma.y)),
        2.0 - L_BlackWhiteGamma.z
    );

    return lerp(levels.x, levels.y, SafePow(component, levels.z));
}

public float SrgbGammaToLinear(float color)
{
    float vLinearSegment = color / 12.92;
    float vExpSegment = pow((color / 1.055) + 0.0521327, 2.4);

    const float cap = 0.04045;
    float select = color > cap ? vExpSegment : vLinearSegment;

    return select;
}
public float2 SrgbGammaToLinear(float2 color)
{
    float2 vLinearSegment = color / float2(12.92);
    float2 vExpSegment = pow((color / float2(1.055)) + float2(0.0521327), float2(2.4));

    const float cap = 0.04045;
    float select = color.r > cap ? vExpSegment.r : vLinearSegment.r;
    float select1 = color.g > cap ? vExpSegment.g : vLinearSegment.g;

    return float2(select, select1);
}
public float3 SrgbGammaToLinear(float3 color)
{
    float3 vLinearSegment = color / float3(12.92);
    float3 vExpSegment = pow((color / float3(1.055)) + float3(0.0521327), float3(2.4));

    const float cap = 0.04045;
    float select = color.r > cap ? vExpSegment.r : vLinearSegment.r;
    float select1 = color.g > cap ? vExpSegment.g : vLinearSegment.g;
    float select2 = color.b > cap ? vExpSegment.b : vLinearSegment.b;

    return float3(select, select1, select2);
}
public float4 SrgbGammaToLinear(float4 color)
{
    float4 vLinearSegment = color / float4(12.92);
    float4 vExpSegment = pow((color / float4(1.055)) + float4(0.0521327), float4(2.4));

    const float cap = 0.04045;
    float select = color.r > cap ? vExpSegment.r : vLinearSegment.r;
    float select1 = color.g > cap ? vExpSegment.g : vLinearSegment.g;
    float select2 = color.b > cap ? vExpSegment.b : vLinearSegment.b;
    float select3 = color.a > cap ? vExpSegment.a : vLinearSegment.a;

    return float4(select, select1, select2, select3);
}

public float3 SrgbLinearToGamma( float3 vLinearColor )
{
	// 15 asm instructions
	float3 vLinearSegment = vLinearColor.rgb * 12.92;
	float3 vExpSegment = ( 1.055 * pow( vLinearColor.rgb, float3 ( 1.0 / 2.4) )) - 0.055;

	float3 vGammaColor = float3(( vLinearColor.r <= 0.0031308 ) ? vLinearSegment.r : vExpSegment.r,
                            ( vLinearColor.g <= 0.0031308 ) ? vLinearSegment.g : vExpSegment.g,
                            ( vLinearColor.b <= 0.0031308 ) ? vLinearSegment.b : vExpSegment.b );

	return vGammaColor.rgb;
}

public float3 DecodeYCoCg(float4 color)
{
    float scale = (color.z * (255.0 / 8.0)) + 1.0;
    float Co = (color.x + (-128.0 / 255.0)) / scale;
    float Cg = (color.y + (-128.0 / 255.0)) / scale;
    float Y = color.w;

    float R = Y + Co - Cg;
    float G = Y + Cg;
    float B = Y - Co - Cg;

    return float3(R, G, B);
}

public float3 DecodeRGBM(float4 color)
{
    const float MaxRange = 6.0;
    return color.rgb * (color.a * MaxRange);
}

public float2 Resize2D(float Base, float4 StartPos_Size)
{
	return StartPos_Size.xy + Base * StartPos_Size.zw;
}

public float2 Resize2D(float2 Base, float4 StartPos_Size)
{
	return StartPos_Size.xy + Base * StartPos_Size.zw;
}

public float2 RotateVector2D(float2 vectorInput, float rotation, float2 scale, float2 offset)
{
    rotation = radians(rotation);
    float sinRot = sin(rotation);
    float cosRot = cos(rotation);

    float2 finalOffset = (scale.xy * -0.5) * float2(cosRot - sinRot, sinRot + cosRot) + offset + float2(0.5);
    float4 xform = scale.xxyy * float4(cosRot, -sinRot, sinRot, cosRot);

    return float2(dot(xform.xy, vectorInput.xy), dot(xform.zw, vectorInput.xy)) + finalOffset;
}

public float2 RotateVector2D(float2 vectorInput, float rotation, float2 scale, float2 offset, float2 center)
{

    rotation = radians(rotation);
    float sinRot = sin(rotation);
    float cosRot = cos(rotation);

    float4 xform = float4(cosRot * scale.x, -sinRot * scale.y, sinRot * scale.x, cosRot* scale.y);

    float2 finalOffset = center + offset - float2(dot(xform.xy, center), dot(xform.zw, center));

    return float2(dot(xform.xy, vectorInput.xy), dot(xform.zw, vectorInput.xy)) + finalOffset;
}

// From vr_common in sbox
public float4 QuaternionMultiplication( float4 q1, float4 q2 )
{
	return float4(
		q2.xyz * q1.w + q1.xyz * q2.w + cross( q1.xyz, q2.xyz ),
		q1.w * q2.w - dot( q1.xyz, q2.xyz )
	);
}

public float3 QuaternionRotation( float3 v, float4 q )
{
	float4 q_c = q.xyzw * float4( -1, -1, -1, 1 );
	return QuaternionMultiplication( q, QuaternionMultiplication( float4( v.xyz, 0 ), q_c.xyzw ) ).xyz;
}

// All of this is directly ported from The Lab Renderer from the unity store.
// These are their utility functions, at least as of the lab.

public float ClampToPositive( float flValue )
{
	return max( 0.0, flValue );
}

public float2 ClampToPositive( float2 vValue )
{
	return max( float2(0.0), vValue.xy );
}

public float3 ClampToPositive( float3 vValue )
{
	return max( float3(0.0), vValue.xyz );
}

public float4 ClampToPositive( float4 vValue )
{
	return max( float4(0.0), vValue.xyzw );
}

// basically map to 0-1
public float LinearRamp( float flMin, float flMax, float flInput )
{
	return saturate( ( flInput - flMin ) / ( flMax - flMin ) );
}

// Remap a value in the range [A,B] to [C,D].
public float RemapVal( float flOldVal, float flOldMin, float flOldMax, float flNewMin, float flNewMax )
{
	// Put the old val into 0-1 range based on the old min/max
	float flValNormalized = ( flOldVal - flOldMin ) / ( flOldMax - flOldMin );

	// Map 0-1 range into new min/max
	return ( flValNormalized * ( flNewMax - flNewMin ) ) + flNewMin;
}

// Remap a value in the range [A,B] to [C,D]. Values <A map to C, and >B maps to D.
public float RemapValClamped( float flOldVal, float flOldMin, float flOldMax, float flNewMin, float flNewMax )
{
	// Put the old val into 0-1 range based on the old min/max
	float flValNormalized = saturate( ( flOldVal - flOldMin ) / ( flOldMax - flOldMin ) );

	// Map 0-1 range into new min/max
	return ( flValNormalized * ( flNewMax - flNewMin ) ) + flNewMin;
}

public float4 PackToColor( float4 vValue )
{
	return ( ( vValue.xyzw * 0.5 ) + 0.5 );
}

public float3 PackToColor( float3 vValue )
{
	return ( ( vValue.xyz * 0.5 ) + 0.5 );
}

public float2 PackToColor( float2 vValue )
{
	return ( ( vValue.xy * 0.5 ) + 0.5 );
}

public float PackToColor( float flValue )
{
	return ( ( flValue * 0.5 ) + 0.5 );
}

public float4 UnpackFromColor( float4 cColor )
{
	return ( ( cColor.xyzw * 2.0 ) - 1.0 );
}

public float3 UnpackFromColor( float3 cColor )
{
	return ( ( cColor.xyz * 2.0 ) - 1.0 );
}

public float2 UnpackFromColor( float2 cColor )
{
	return ( ( cColor.xy * 2.0 ) - 1.0 );
}

public float UnpackFromColor( float flColor )
{
	return ( ( flColor * 2.0 ) - 1.0 );
}

public float3 DecodeDxt5Normal(float4 bumpTexel)
{
    float2 temp = UnpackFromColor(bumpTexel.ag);
    temp.y = -temp.y;
    return float3(temp, sqrt(saturate(1 - dot(temp, temp))));
}

public float2 sign_not_zero(float2 v)
{
    return step(0.0, v) * 2.0 - 1.0;
}

public float3 hemi_oct_to_float32x3(float2 e)
{
    float3 v = float3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    return normalize(v);
}

public float3 oct_to_float32x3(float2 e)
{
    float3 v = float3(e.xy, 1.0 - abs(e.x) - abs(e.y));
    if (v.z < 0.0)
    {
        v.xy = (1.0 - abs(v.yx)) * sign_not_zero(v.xy);
    }
    return normalize(v);
}

// Safe normalize that handles degenerate normals from zero-scaled bones
public float3 safeNormalize(float3 v)
{
    float len2 = dot(v, v);
    if (len2 < 1e-8)
    {
        return float3(0.0, 0.0, 1.0);
    }
    return v * rsqrt(len2);
}

// Unpack HemiOct normal map
public float3 DecodeHemiOctahedronNormal(float2 vHemiOct)
{
    //Reconstruct the tangent vector from the map
    float2 temp = float2(vHemiOct.x + vHemiOct.y - 1.003922, vHemiOct.x - vHemiOct.y);
    float3 tangentNormal = hemi_oct_to_float32x3(temp);

    // This is free, it gets compiled into the TS->WS matrix mul
    tangentNormal.y = -tangentNormal.y;
    return tangentNormal;
}
