import common.Core;
import common.compression;


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

public struct VInput
{
    float3 pos : POSITION0;
    NormalData normalData;
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
    out_.normal = VInput.normalData.bitangent;
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
