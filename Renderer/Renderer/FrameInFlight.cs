using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using ValveResourceFormat.Renderer2.RHI;
using Buffer = ValveResourceFormat.Renderer2.RHI.Buffer;
using Vortice.Vulkan;
namespace ValveResourceFormat.Renderer2;

internal class FrameInFlight
{
    public CommandList CommandList { get; private set; }
    public ViewConstants viewConstantsCPU;
    public Buffer viewConstantBuffer;

    internal uint lastSubmissionIndex;

    public VkSemaphore PresentComplete { get; private set; }

    public FrameInFlight()
    {
        CommandList = new(RenderDevice!.QueueFamilyIndices.GraphicsFamily!.Value);

        viewConstantsCPU = new ViewConstants();
        viewConstantBuffer = new Buffer((ulong)Marshal.SizeOf<ViewConstants>(), VkBufferUsageFlags.UniformBuffer, VmaMemoryUsage.GpuToCpu);

        PresentComplete = RenderDevice!.CreateSemaphore();
    }
}
