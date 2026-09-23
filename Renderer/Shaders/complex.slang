import common.Core;
import common.compression;
import common.ViewConstants;

struct Parameters : IParameters
{
    float4x4 view;
    float4x4 projection;
};

struct VS_OUT {
    float4 clipPos : SV_Position;
    float3 normal : TEXCOORD0;
    float2 uv : TEXCOORD1;
    float linearDepth : TEXCOORD2;
};


[vk::push_constant] PushData<Parameters> pc;

public struct VInput
{
    float3 pos : POSITION0;
    NormalData normalData;
    float2 uv : TEXCOORD0;
}


//Adding a test comment too for good measure
  
[shader("vertex")]
void vertMain(VInput VInput,
    out VS_OUT out_
) {
    var ViewConstants = pc.ViewConstants;
    out_.clipPos = mul(ViewConstants.g_matViewToProjection, mul(ViewConstants.g_matWorldToView, float4(VInput.pos, 1.0f)));

    out_.linearDepth = out_.clipPos.z / out_.clipPos.w;
    out_.normal = VInput.normalData.tang;
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
