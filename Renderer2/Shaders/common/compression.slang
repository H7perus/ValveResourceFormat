// File containing vertex inputs and functions to deal with compressed normals and tangents.
import Core;

[ConstantRange(0, 2)]
extern static const int D_COMPRESSED_NORMALS_AND_TANGENTS = 0;

public struct NormalData
{
    private Conditional<float3, D_COMPRESSED_NORMALS_AND_TANGENTS < 2> m_raw : NORMAL;
    private Conditional<uint, D_COMPRESSED_NORMALS_AND_TANGENTS == 2> m_packed : NORMAL;

    public property float3 normal
    {
        get
        {
            if (D_COMPRESSED_NORMALS_AND_TANGENTS == 0 || D_COMPRESSED_NORMALS_AND_TANGENTS == 1) return m_raw.get().value;
            else {
                float3 normal;
                float4 tangent;
                DecompressNormalTangent2(m_packed.get().value, normal, tangent);
                return normal;
            };
        }
    }
    public property float3 tangent
    {
        get
        {
            if (D_COMPRESSED_NORMALS_AND_TANGENTS == 0 || D_COMPRESSED_NORMALS_AND_TANGENTS == 1) return m_raw.get().value;
            else {
                float3 normal;
                float4 tangent;
                DecompressNormalTangent2(m_packed.get().value, normal, tangent);
                return tangent.xyz;
            };
        }
    }
    public property float3 bitangent
    {
        get
        {
            if (D_COMPRESSED_NORMALS_AND_TANGENTS == 0 || D_COMPRESSED_NORMALS_AND_TANGENTS == 1) return m_raw.get().value;
            else {
                float3 normal;
                float4 tangent;
                DecompressNormalTangent2(m_packed.get().value, normal, tangent);
                return cross(tangent.xyz, normal) * tangent.w;
            };
        }
    }
}


//Decompress a byte4 normal in the 0..255 range to a float4 tangent
//vec4 DecompressTangent( uint8_t4 inputNormal )
//{
//    float fOne   = 1.0f;
//    vec4 ztztSignBits	= vec4(lessThan(inputNormal, vec4(128.0f)));        // sign bits for zs and bitangent (1 or 0)  set-less-than (slt) asm instruction
//    vec4 xyxyAbs		= abs( inputNormal - 128.0f ) - ztztSignBits;		// 0..127
//    vec4 xyxySignBits	= vec4(lessThan(xyxyAbs, vec4(64.0f)));							// sign bits for xs and ys (1 or 0)
//    vec4 normTan		= (abs( xyxyAbs - 64.0f ) - xyxySignBits) / 63.0f;	// abs({nX, nY, tX, tY})

//    vec4 outputTangent;
//    outputTangent.xy	= normTan.zw;										// abs({tX, tY, __, __})

//    vec4 xyxySigns	= 1 - 2*xyxySignBits;								// Convert sign bits to signs
//    vec4 ztztSigns	= 1 - 2*ztztSignBits;								// ( [1,0] -> [-1,+1] )

//    outputTangent.z		= 1.0f - outputTangent.x - outputTangent.y;			// Project onto x+y+z=1
//    outputTangent.xyz	= normalize( outputTangent.xyz );					// Normalize onto unit sphere
//    outputTangent.xy   *= xyxySigns.zw;										// Restore x and y signs
//    outputTangent.z	   *= ztztSigns.z;										// Restore z sign
//    outputTangent.w		= ztztSigns.w;

//    return outputTangent;
//}

//Decompress a byte4 normal in the 0..255 range to a float3 normal
//vec3 DecompressNormal( vec4 inputNormal )
//{
//    float fOne   = 1.0f;
//    vec3 outputNormal = vec3(0);

//    vec2 ztSigns      = vec2(lessThan(inputNormal.xy, vec2(128.0f))); // sign bits for zs and bitangent (1 or 0)  set-less-than (slt) asm instruction
//    vec2 xyAbs        = abs( inputNormal.xy - 128.0f ) - ztSigns;     // 0..127
//    vec2 xySigns      = vec2(lessThan(xyAbs, vec2(64.0f)));             // sign bits for xs and ys (1 or 0)
//    outputNormal.xy     = ( abs( xyAbs - 64.0f ) - xySigns ) / 63.0f;   // abs({nX, nY})

//    outputNormal.z      = 1.0f - outputNormal.x - outputNormal.y;       // Project onto x+y+z=1
//    outputNormal.xyz    = normalize( outputNormal.xyz );                // Normalize onto unit sphere

//    outputNormal.xy    *= mix( vec2(fOne,fOne), vec2(-fOne, -fOne), xySigns   );                // Restore x and y signs
//    outputNormal.z     *= mix( fOne, -fOne, ztSigns.x );                // Restore z sign

//    return normalize(outputNormal);
//}

#define TAU 6.2831853071795864769252867665590
void DecompressNormalTangent2(
    uint nPackedFrame,
    out float3 normal,
    out float4 tangent)
{
    uint signBit = nPackedFrame & 1u;
    float tBits = float((nPackedFrame >> 1u) & 0x7FFu);
    float xBits = float((nPackedFrame >> 12u) & 0x3FFu);
    float yBits = float((nPackedFrame >> 22u) & 0x3FFu);

    // Unpack from 0..1 to -1..1
    float nPackedFrameX = (xBits / 1023.0) * 2.0 - 1.0;
    float nPackedFrameY = (yBits / 1023.0) * 2.0 - 1.0;

    // Z is never given a sign. Negative Z is reconstructed from XY.
    float derivedNormalZ =
        1.0 - abs(nPackedFrameX) - abs(nPackedFrameY);

    float3 unpackedNormal = float3(
        nPackedFrameX,
        nPackedFrameY,
        derivedNormalZ);

    // Compensate XY when the derived Z is negative.
    float negativeZCompensation = saturate(-derivedNormalZ);

    unpackedNormal.xy += select(
        float2(negativeZCompensation),
        float2(-negativeZCompensation),
        unpackedNormal.xy >= float2(0.0));

    normal = normalize(unpackedNormal);

    // Invert tangent when normal Z is negative.
    float tangentSign = normal.z >= 0.0 ? 1.0 : -1.0;

    // Equal to:
    // 1.0 / (tangentSign + normal.z)
    float rcpTangentZ = 1.0 / (tangentSign + normal.z);

    float3 unalignedTangent;

    // Keep these operations in this order.
    unalignedTangent.x =
        -tangentSign * (normal.x * normal.x) * rcpTangentZ + 1.0;

    unalignedTangent.y =
        -tangentSign * ((normal.x * normal.y) * rcpTangentZ);

    unalignedTangent.z =
        -tangentSign * normal.x;

    // Tangent rotation.
    float nPackedFrameT =
        (tBits / 2047.0) * TAU;

    float cosT = cos(nPackedFrameT);
    float sinT = sin(nPackedFrameT);

    tangent.xyz =
        unalignedTangent * cosT +
        cross(normal, unalignedTangent) * sinT;

    // Bitangent sign bit is inverted: 0 = negative.
    tangent.w = signBit == 0u ? -1.0 : 1.0;
}

//void GetOptionallyCompressedNormalTangent(out vec3 normal, out vec4 tangent)
//{
//    #if (D_COMPRESSED_NORMALS_AND_TANGENTS == 0)
//        normal = vNORMAL.xyz;
//        tangent = vTANGENT.xyzw;
//    #elif (D_COMPRESSED_NORMALS_AND_TANGENTS == 1)
//        normal = DecompressNormal(vNORMAL * 255.0);
//        tangent = DecompressTangent(vNORMAL * 255.0);
//    #elif (D_COMPRESSED_NORMALS_AND_TANGENTS == 2)
//        DecompressNormalTangent2(vNORMAL, normal, tangent);
//    #endif
//}
