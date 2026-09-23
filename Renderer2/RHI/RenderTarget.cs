using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Text;
using Vortice.Vulkan;
using ValveResourceFormat.Renderer2.RHI.Utils;
namespace ValveResourceFormat.Renderer2.RHI;

internal class RenderTarget : IResource
{
    public Image ColorTarget { get; internal set; }
    public Image DepthTarget { get; internal set; }

    public uint SampleCount { get; internal set; }

    public RenderTarget(uint width, uint height, VkFormat colorFormat, VkFormat depthFormat, uint sampleCount = 1)
    {
        Debug.Assert(IsDepthFormat(depthFormat));
        SampleCount = sampleCount;
        ColorTarget = new Image(width, height, colorFormat, sampleCount: sampleCount, imageUsage: VkImageUsageFlags.ColorAttachment | VkImageUsageFlags.TransferDst);
        DepthTarget = new Image(width, height, depthFormat, sampleCount: sampleCount, imageUsage: VkImageUsageFlags.DepthStencilAttachment | VkImageUsageFlags.TransferDst);
    }

    public void Resize(uint width, uint height)
    {
        ColorTarget.Destroy();
        ColorTarget = new Image(width, height, ColorTarget.Format, sampleCount: SampleCount, imageUsage: VkImageUsageFlags.ColorAttachment | VkImageUsageFlags.TransferDst);

        DepthTarget.Destroy();
        DepthTarget = new Image(width, height, DepthTarget.Format, sampleCount: SampleCount, imageUsage: VkImageUsageFlags.DepthStencilAttachment | VkImageUsageFlags.TransferDst);
    }

    public void Destroy()
    {
        ColorTarget.Destroy();
        DepthTarget.Destroy();
    }
}
