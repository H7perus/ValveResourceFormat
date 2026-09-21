using System;
using System.Collections.Generic;
using System.Text;


using Vortice.Vulkan;
using static Vortice.Vulkan.Vulkan;

namespace ValveResourceFormat.Renderer2.RHI
{
    public abstract class Pipeline
    {
        public VkPipeline Handle { get; protected set; }

        public Pipeline()
        {
        }

        unsafe public virtual void Destroy()
        {
            if (Handle.Handle != 0)
                RenderDevice!.VkDeviceApi.vkDestroyPipeline(Handle, null);
        }

        public void ReplaceWith(Pipeline replacement)
        {
            Destroy();
            Handle = replacement.Handle;
        }
    }
}
