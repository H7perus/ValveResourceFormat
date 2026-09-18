import common.Core;

struct Parameters {
    float4x4 view;
    float4x4 projection;
};

struct VS_OUT {
    float4 clipPos : SV_Position;
    float3 normal : TEXCOORD0;
    float2 uv : TEXCOORD1;
    float linearDepth : TEXCOORD2;
};

[vk::push_constant] DescriptorHandle<ConstantBuffer<Parameters>> uBuffer;

[ConstantRange(0, 2)] extern static const int D_COMPRESSED_NORMALS_AND_TANGENTS = 0;

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


public struct NormalData
{
    private Conditional<float3, D_COMPRESSED_NORMALS_AND_TANGENTS == 0 || D_COMPRESSED_NORMALS_AND_TANGENTS == 1> m_raw : NORMAL;
    private Conditional<uint, D_COMPRESSED_NORMALS_AND_TANGENTS == 2> m_packed : NORMAL;

    //public __init(float3 n)
    //{
    //    m_raw = n;
    //    m_packed = packOctahedral(n); // your encode fn
    //}

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

public struct VInput
{
    float3 pos : POSITION0;
    NormalData normalData : NORMAL0;
    float2 uv : TEXCOORD0;
}

[shader("vertex")]
void vertMain(VInput VInput,
    out VS_OUT out_
) {
    var params = *uBuffer;
    out_.clipPos = mul(params.projection, mul(params.view, float4(VInput.pos, 1.0f)));
    // Compute linear depth in [0,1] range for Vulkan
    out_.linearDepth = out_.clipPos.z / out_.clipPos.w;
    out_.normal = VInput.normalData.tangent;
    out_.uv = VInput.uv;
}

[shader("fragment")]
void fragMain(
    VS_OUT in_,
    out float4 color: SV_Target,
    out float outDepth: SV_Depth
) {
    DescriptorHandle<Sampler2D> texture = DescriptorHandle<Sampler2D>(uint2(0, 0));

    // Visualize normals: convert from [-1,1] to [0,1] range
    float3 normColor = in_.normal * 0.5f + 0.5f;
    color = float4(normColor, 1.0f);

    //color = texture.Sample(in_.uv);

    outDepth = in_.linearDepth;
}
