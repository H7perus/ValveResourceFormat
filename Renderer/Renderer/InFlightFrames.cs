using System;
using System.Collections.Generic;
using System.Text;

using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer;

internal class InFlightFrames
{
    FrameInFlight[] frames;

    public FrameInFlight CurrentFrame => frames[FramesSubmitted % FrameCount];

    public ulong FramesSubmitted { get; private set; } = 1;
    public ulong FramesCompleted => (FramesSubmitted - Math.Min(FrameCount, FramesSubmitted));
    public uint FrameCount => (uint)frames.Length;
    public readonly VkSemaphore timelineSemaphore;

    public InFlightFrames(uint frameCount)
    {
        frames = new FrameInFlight[frameCount];

        for(int i = 0; i < frames.Length; i++)
        {
            frames[i] = new FrameInFlight();
        }

        timelineSemaphore = RenderDevice!.CreateSemaphore(isTimeline: true);
    }

    public FrameInFlight StartNextFrame()
    {
        RenderDevice!.WaitOnTimelineSemaphore(timelineSemaphore, FramesCompleted);

        return frames[FramesSubmitted % FrameCount];
    }

    public void EndFrame()
    {
        FramesSubmitted++;
    }

}
