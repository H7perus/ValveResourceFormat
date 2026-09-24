using System;
using System.Collections.Generic;
using System.Text;
using ValveResourceFormat.Renderer.RHI;

namespace ValveResourceFormat.Renderer;

internal class View
{
}

public struct ViewContext
{
    public required Camera Camera { get; set; }
}
