using System;
using System.Collections.Generic;
using System.Text;
using ValveResourceFormat.Renderer2.RHI;

namespace ValveResourceFormat.Renderer2;

internal class View
{
}

public struct ViewContext
{
    public required Camera Camera { get; set; }

    public required Swapchain Framebuffer { get; set; }
}
