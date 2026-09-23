global using static ValveResourceFormat.Renderer2.RHI.Utils.FormatChecks;
using System;
using System.Collections.Generic;
using System.Text;
using Vortice.Vulkan;

namespace ValveResourceFormat.Renderer2.RHI.Utils;




internal class FormatChecks
{
    static public bool IsDepthFormat(VkFormat format)
    {
        return
            format == VkFormat.D16Unorm ||
            format == VkFormat.D16UnormS8Uint ||
            format == VkFormat.D24UnormS8Uint ||
            format == VkFormat.D32Sfloat ||
            format == VkFormat.D32SfloatS8Uint;
    }
}
