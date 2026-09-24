using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using ValveResourceFormat.Renderer.RHI;
using Buffer = ValveResourceFormat.Renderer.RHI.Buffer;
using Vortice.Vulkan;
namespace ValveResourceFormat.Renderer;

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
